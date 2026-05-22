import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../common/dto/api-error-response.dto';
import { PublicProjectResponseDto } from './dto/public-project-response.dto';
import { ProjectsService, type PublicProjectView } from './projects.service';

@ApiTags('Projects')
@Controller('api/projects')
export class SharedProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get('shared/:slug')
  @ApiOperation({ summary: 'Get a publicly shared read-only project without authentication' })
  @ApiParam({ name: 'slug', description: 'Public project share slug' })
  @ApiOkResponse({ type: PublicProjectResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid share request', type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Shared project not found or disabled' })
  getSharedProject(@Param('slug') slug: string): Promise<PublicProjectView> {
    return this.projectsService.findSharedProject(slug);
  }
}
