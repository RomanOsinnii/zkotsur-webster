import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthTokenPayload } from '../auth/auth.types';
import { ApiErrorResponseDto } from '../common/dto/api-error-response.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectEntity } from './project.entity';
import { ProjectsService } from './projects.service';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all persisted projects ordered by last update' })
  @ApiOkResponse({ type: ProjectResponseDto, isArray: true })
  getProjects(@CurrentUser() user: AuthTokenPayload): Promise<ProjectEntity[]> {
    return this.projectsService.findAll(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a persisted project by id, including the full canvas JSON payload' })
  @ApiParam({ name: 'id', description: 'Project id in UUID format' })
  @ApiOkResponse({ type: ProjectResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid UUID or invalid request', type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Project not found' })
  getProjectById(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: AuthTokenPayload): Promise<ProjectEntity> {
    return this.projectsService.findOne(id, user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new persisted project from the current editor payload' })
  @ApiCreatedResponse({ type: ProjectResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed', type: ApiErrorResponseDto })
  createProject(@Body() dto: CreateProjectDto, @CurrentUser() user: AuthTokenPayload): Promise<ProjectEntity> {
    return this.projectsService.create(dto, user.sub);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing persisted project' })
  @ApiParam({ name: 'id', description: 'Project id in UUID format' })
  @ApiOkResponse({ type: ProjectResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid UUID or validation failed', type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Project not found' })
  updateProject(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: AuthTokenPayload
  ): Promise<ProjectEntity> {
    return this.projectsService.update(id, dto, user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a persisted project' })
  @ApiParam({ name: 'id', description: 'Project id in UUID format' })
  @ApiNoContentResponse({ description: 'Project deleted' })
  @ApiBadRequestResponse({ description: 'Invalid UUID', type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Project not found' })
  async deleteProject(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: AuthTokenPayload): Promise<void> {
    await this.projectsService.remove(id, user.sub);
  }
}
