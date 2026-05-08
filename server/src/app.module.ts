import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health/health.controller';
import { ProjectsModule } from './projects/projects.module';
import { TemplatesController } from './templates/templates.controller';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env']
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('POSTGRES_HOST', 'localhost'),
        port: Number(configService.get<string>('POSTGRES_PORT', '5432')),
        username: configService.get<string>('POSTGRES_USER', 'webster'),
        password: configService.get<string>('POSTGRES_PASSWORD', 'webster'),
        database: configService.get<string>('POSTGRES_DB', 'webster'),
        autoLoadEntities: true,
        synchronize: configService.get<string>('DB_SYNCHRONIZE', 'true') === 'true',
        ssl: configService.get<string>('POSTGRES_SSL') === 'true' ? { rejectUnauthorized: false } : false
      })
    }),
    UsersModule,
    AuthModule,
    ProjectsModule
  ],
  controllers: [HealthController, TemplatesController]
})
export class AppModule {}
