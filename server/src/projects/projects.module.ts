import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ProjectEntity } from './project.entity';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { SharedProjectsController } from './shared-projects.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectEntity]), AuthModule],
  controllers: [ProjectsController, SharedProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService]
})
export class ProjectsModule {}
