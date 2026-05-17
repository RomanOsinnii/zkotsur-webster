import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>
  ) {}

  findById(id: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ where: { email: email.toLowerCase() } });
  }

  findByEmailWithPassword(email: string): Promise<UserEntity | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();
  }

  findByIdWithPassword(id: string): Promise<UserEntity | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id })
      .getOne();
  }

  create(user: Pick<UserEntity, 'name' | 'email' | 'passwordHash'>): Promise<UserEntity> {
    const entity = this.usersRepository.create({
      name: user.name,
      email: user.email.toLowerCase(),
      passwordHash: user.passwordHash
    });
    return this.usersRepository.save(entity);
  }

  async updateName(id: string, name: string): Promise<UserEntity | null> {
    const user = await this.findById(id);
    if (!user) {
      return null;
    }

    user.name = name.trim();
    return this.usersRepository.save(user);
  }

  async updateProfile(id: string, patch: { name?: string; avatarUrl?: string | null }): Promise<UserEntity | null> {
    const user = await this.findById(id);
    if (!user) {
      return null;
    }

    if (patch.name !== undefined) {
      user.name = patch.name.trim();
    }
    if (patch.avatarUrl !== undefined) {
      user.avatarUrl = patch.avatarUrl;
    }

    return this.usersRepository.save(user);
  }

  async updatePassword(id: string, passwordHash: string): Promise<UserEntity | null> {
    const user = await this.findById(id);
    if (!user) {
      return null;
    }

    user.passwordHash = passwordHash;
    return this.usersRepository.save(user);
  }

  async setEmailVerificationToken(userId: string, tokenHash: string): Promise<void> {
    await this.usersRepository.update(userId, {
      emailVerificationTokenHash: tokenHash,
      emailVerificationSentAt: new Date()
    });
  }

  async setPasswordResetToken(userId: string, tokenHash: string): Promise<void> {
    await this.usersRepository.update(userId, {
      passwordResetTokenHash: tokenHash,
      passwordResetSentAt: new Date()
    });
  }

  findByEmailVerificationTokenHash(tokenHash: string): Promise<UserEntity | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.emailVerificationTokenHash')
      .where('user.emailVerificationTokenHash = :tokenHash', { tokenHash })
      .getOne();
  }

  findByPasswordResetTokenHash(tokenHash: string): Promise<UserEntity | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordResetTokenHash')
      .where('user.passwordResetTokenHash = :tokenHash', { tokenHash })
      .getOne();
  }

  async markEmailVerified(userId: string): Promise<UserEntity | null> {
    const user = await this.findById(userId);
    if (!user) {
      return null;
    }

    user.emailVerifiedAt = new Date();
    user.emailVerificationTokenHash = null;
    user.emailVerificationSentAt = null;
    return this.usersRepository.save(user);
  }

  async clearPasswordResetToken(userId: string): Promise<void> {
    await this.usersRepository.update(userId, {
      passwordResetTokenHash: null,
      passwordResetSentAt: null
    });
  }
}
