import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../common/dto/api-error-response.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { RequestPasswordResetResponseDto } from './dto/request-password-reset-response.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResendVerificationResponseDto } from './dto/resend-verification-response.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResetPasswordResponseDto } from './dto/reset-password-response.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerifyEmailResponseDto } from './dto/verify-email-response.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthTokenPayload } from './auth.types';

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiOkResponse({ type: RegisterResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed or email already registered', type: ApiErrorResponseDto })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend account email verification link' })
  @ApiOkResponse({ type: ResendVerificationResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed', type: ApiErrorResponseDto })
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto);
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Confirm account email with verification token' })
  @ApiOkResponse({ type: VerifyEmailResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid or expired token', type: ApiErrorResponseDto })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiOkResponse({ type: RequestPasswordResetResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed', type: ApiErrorResponseDto })
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with password reset token' })
  @ApiOkResponse({ type: ResetPasswordResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed or token is invalid', type: ApiErrorResponseDto })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login and receive a JWT access token' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed', type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password', type: ApiErrorResponseDto })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token', type: ApiErrorResponseDto })
  me(@CurrentUser() user: AuthTokenPayload) {
    return this.authService.me(user.sub);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the currently authenticated user profile' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed', type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token', type: ApiErrorResponseDto })
  updateMe(@CurrentUser() user: AuthTokenPayload, @Body() dto: UpdateMeDto) {
    return this.authService.updateMe(user.sub, dto);
  }

  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password for currently authenticated user' })
  @ApiOkResponse({ description: 'Password updated' })
  @ApiBadRequestResponse({ description: 'Validation failed', type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token', type: ApiErrorResponseDto })
  async changeMyPassword(@CurrentUser() user: AuthTokenPayload, @Body() dto: ChangePasswordDto) {
    await this.authService.changePassword(user.sub, dto);
    return { ok: true };
  }
}
