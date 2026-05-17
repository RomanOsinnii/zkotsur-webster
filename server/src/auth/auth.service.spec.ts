import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(async () => 'hashed-password'),
  compare: jest.fn(async () => true)
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findByEmailWithPassword: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            setEmailVerificationToken: jest.fn(),
            findByEmailVerificationTokenHash: jest.fn(),
            markEmailVerified: jest.fn(),
            findByIdWithPassword: jest.fn(),
            updatePassword: jest.fn(),
            updateProfile: jest.fn()
          }
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('token-value')
          }
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: string) => fallback)
          }
        }
      ]
    }).compile();

    service = moduleRef.get(AuthService);
    usersService = moduleRef.get(UsersService);
    jwtService = moduleRef.get(JwtService);
  });

  it('rejects duplicate registration emails', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 'user-1',
      name: 'Existing',
      email: 'existing@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
      projects: []
    } as never);

    await expect(service.register({
      name: 'Existing',
      email: 'existing@example.com',
      password: 'secret123'
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid login credentials', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue(null);

    await expect(service.login({
      email: 'missing@example.com',
      password: 'secret123'
    })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns token and user on successful login', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue({
      id: 'user-1',
      name: 'Tester',
      email: 'tester@example.com',
      emailVerifiedAt: new Date(),
      passwordHash: '$2a$10$YO2IuRuxg9o8/okMPY7afOw0YttWJJe0qXTBToYtL6vhfVqlhK/SW',
      createdAt: new Date(),
      updatedAt: new Date(),
      projects: []
    } as never);

    const response = await service.login({
      email: 'tester@example.com',
      password: 'secret123'
    });

    expect(response.accessToken).toBe('token-value');
    expect(response.user.email).toBe('tester@example.com');
    expect(jwtService.signAsync).toHaveBeenCalled();
  });

  it('rejects login if email is not verified', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue({
      id: 'user-1',
      name: 'Tester',
      email: 'tester@example.com',
      emailVerifiedAt: null,
      passwordHash: '$2a$10$YO2IuRuxg9o8/okMPY7afOw0YttWJJe0qXTBToYtL6vhfVqlhK/SW',
      createdAt: new Date(),
      updatedAt: new Date(),
      projects: []
    } as never);

    await expect(service.login({
      email: 'tester@example.com',
      password: 'secret123'
    })).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
