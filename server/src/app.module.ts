import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { ProjectsController } from './projects/projects.controller';
import { TemplatesController } from './templates/templates.controller';

@Module({
  imports: [],
  controllers: [HealthController, TemplatesController, ProjectsController]
})
export class AppModule {}
