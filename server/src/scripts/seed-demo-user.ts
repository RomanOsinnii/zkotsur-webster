import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { hashPassword } from '../auth/password';

const demoUser = {
  email: 'demo@webster.local',
  password: 'Demo123!',
  name: 'Demo User'
} as const;

async function seedDemoUser() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log']
  });

  try {
    const usersService = app.get(UsersService);
    const passwordHash = await hashPassword(demoUser.password);
    const existingUser = await usersService.findByEmail(demoUser.email);

    if (existingUser) {
      await usersService.updateProfile(existingUser.id, { name: demoUser.name });
      await usersService.updatePassword(existingUser.id, passwordHash);
      if (!existingUser.emailVerifiedAt) {
        await usersService.markEmailVerified(existingUser.id);
      }

      console.log(`Demo user already existed. Credentials refreshed for ${demoUser.email}.`);
      return;
    }

    const createdUser = await usersService.create({
      name: demoUser.name,
      email: demoUser.email,
      passwordHash
    });

    await usersService.markEmailVerified(createdUser.id);
    console.log(`Demo user created: ${demoUser.email}`);
  } finally {
    await app.close();
  }
}

void seedDemoUser().catch((error: unknown) => {
  console.error('Failed to seed demo user.', error);
  process.exitCode = 1;
});
