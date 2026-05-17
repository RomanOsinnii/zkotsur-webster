import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { hash, compare } from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { createTransport } from 'nodemailer';
import { UsersService } from '../users/users.service';
import { UserEntity } from '../users/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { AuthTokenPayload } from './auth.types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('Email is already registered');
    }

    const passwordHash = await hash(dto.password, 10);
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      passwordHash
    });

    const emailSent = await this.issueAndSendEmailVerification(user);

    return {
      requiresEmailVerification: true,
      message: emailSent
        ? 'Account created. Check your email to verify your account.'
        : 'Account created. Email sender is not configured. Contact support to complete verification.'
    };
  }

  async resendVerification(dto: ResendVerificationDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || user.emailVerifiedAt) {
      return {
        ok: true,
        message: 'If an unverified account exists for this email, a verification email has been sent.'
      };
    }

    await this.issueAndSendEmailVerification(user);

    return {
      ok: true,
      message: 'If an unverified account exists for this email, a verification email has been sent.'
    };
  }

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (user && user.emailVerifiedAt) {
      await this.issueAndSendPasswordReset(user);
    }

    return {
      ok: true,
      message: 'If an account exists for this email, a password reset email has been sent.'
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashVerificationToken(dto.token.trim());
    const user = await this.usersService.findByPasswordResetTokenHash(tokenHash);
    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const nextPasswordHash = await hash(dto.newPassword, 10);
    const updatedUser = await this.usersService.updatePassword(user.id, nextPasswordHash);
    if (!updatedUser) {
      throw new BadRequestException('User account no longer exists');
    }

    await this.usersService.clearPasswordResetToken(user.id);

    return {
      ok: true,
      message: 'Password updated. You can now log in with your new password.'
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException('Email is not verified yet');
    }

    return this.buildAuthResponse(user);
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const tokenHash = this.hashVerificationToken(dto.token.trim());
    const user = await this.usersService.findByEmailVerificationTokenHash(tokenHash);
    if (!user) {
      throw new BadRequestException('Invalid or expired email verification token');
    }

    const updatedUser = await this.usersService.markEmailVerified(user.id);
    if (!updatedUser) {
      throw new BadRequestException('User account no longer exists');
    }

    return {
      ok: true,
      email: updatedUser.email,
      message: 'Email confirmed. You can now log in.'
    };
  }

  async me(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User account no longer exists');
    }
    return user;
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    if (dto.name === undefined && dto.avatarUrl === undefined) {
      throw new BadRequestException('At least one profile field must be provided');
    }

    const user = await this.usersService.updateProfile(userId, {
      name: dto.name,
      avatarUrl: dto.avatarUrl !== undefined ? (dto.avatarUrl.trim() || null) : undefined
    });
    if (!user) {
      throw new UnauthorizedException('User account no longer exists');
    }
    return user;
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    const user = await this.usersService.findByIdWithPassword(userId);
    if (!user) {
      throw new UnauthorizedException('User account no longer exists');
    }

    const matches = await compare(dto.currentPassword, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const nextPasswordHash = await hash(dto.newPassword, 10);
    await this.usersService.updatePassword(userId, nextPasswordHash);
  }

  private async buildAuthResponse(user: UserEntity) {
    const payload: AuthTokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET', 'webster-secret'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '7d')
    });

    const { passwordHash: _passwordHash, ...safeUser } = user as UserEntity & { passwordHash?: string };
    return {
      accessToken,
      user: safeUser
    };
  }

  private generateVerificationToken(): string {
    return randomBytes(32).toString('hex');
  }

  private hashVerificationToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async issueAndSendEmailVerification(user: Pick<UserEntity, 'id' | 'email' | 'name'>): Promise<boolean> {
    const verificationToken = this.generateVerificationToken();
    const verificationTokenHash = this.hashVerificationToken(verificationToken);
    await this.usersService.setEmailVerificationToken(user.id, verificationTokenHash);

    const baseUrl = this.configService.get<string>('CLIENT_BASE_URL', 'http://localhost:5173').replace(/\/$/, '');
    const verificationPreviewUrl = `${baseUrl}/?verifyEmailToken=${encodeURIComponent(verificationToken)}`;
    return this.sendVerificationEmail(user.email, user.name, verificationPreviewUrl);
  }

  private async issueAndSendPasswordReset(user: Pick<UserEntity, 'id' | 'email' | 'name'>): Promise<boolean> {
    const resetToken = this.generateVerificationToken();
    const resetTokenHash = this.hashVerificationToken(resetToken);
    await this.usersService.setPasswordResetToken(user.id, resetTokenHash);

    const baseUrl = this.configService.get<string>('CLIENT_BASE_URL', 'http://localhost:5173').replace(/\/$/, '');
    const resetPreviewUrl = `${baseUrl}/?resetPasswordToken=${encodeURIComponent(resetToken)}`;
    return this.sendPasswordResetEmail(user.email, user.name, resetPreviewUrl);
  }

  private async sendVerificationEmail(email: string, name: string, verificationUrl: string): Promise<boolean> {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpFrom = this.configService.get<string>('SMTP_FROM');

    if (!smtpHost || !smtpFrom) {
      this.logger.warn(`SMTP is not configured. Verification preview for ${email}: ${verificationUrl}`);
      return false;
    }

    const smtpPort = Number(this.configService.get<string>('SMTP_PORT', '587'));
    const smtpSecure = this.configService.get<string>('SMTP_SECURE', 'false') === 'true';
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    const transport = createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined
    });

    try {
      await transport.sendMail({
        from: smtpFrom,
        to: email,
        subject: 'Verify your Webster account',
        html: `<p>Hello ${name},</p><p>Confirm your Webster account by clicking this link:</p><p><a href="${verificationUrl}">${verificationUrl}</a></p>`
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error instanceof Error ? error.stack : String(error));
      this.logger.warn(`Fallback verification preview for ${email}: ${verificationUrl}`);
      return false;
    }
  }

  private async sendPasswordResetEmail(email: string, name: string, resetUrl: string): Promise<boolean> {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpFrom = this.configService.get<string>('SMTP_FROM');

    if (!smtpHost || !smtpFrom) {
      this.logger.warn(`SMTP is not configured. Password reset preview for ${email}: ${resetUrl}`);
      return false;
    }

    const smtpPort = Number(this.configService.get<string>('SMTP_PORT', '587'));
    const smtpSecure = this.configService.get<string>('SMTP_SECURE', 'false') === 'true';
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    const transport = createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined
    });

    try {
      await transport.sendMail({
        from: smtpFrom,
        to: email,
        subject: 'Reset your Webster password',
        html: `<p>Hello ${name},</p><p>Reset your Webster password by clicking this link:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}`, error instanceof Error ? error.stack : String(error));
      this.logger.warn(`Fallback password reset preview for ${email}: ${resetUrl}`);
      return false;
    }
  }
}
