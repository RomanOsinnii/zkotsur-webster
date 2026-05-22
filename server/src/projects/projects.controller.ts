import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseEnumPipe, ParseUUIDPipe, Post, Put, Res, StreamableFile, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthTokenPayload } from '../auth/auth.types';
import { ApiErrorResponseDto } from '../common/dto/api-error-response.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectShareResponseDto } from './dto/project-share-response.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectEntity } from './project.entity';
import { ProjectExportFormat, ProjectsService } from './projects.service';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all persisted projects ordered by most recent open or update' })
  @ApiOkResponse({ type: ProjectResponseDto, isArray: true })
  getProjects(@CurrentUser() user: AuthTokenPayload): Promise<ProjectEntity[]> {
    return this.projectsService.findAll(user.sub);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recently opened or edited projects for the current user' })
  @ApiOkResponse({ type: ProjectResponseDto, isArray: true })
  getRecentProjects(@CurrentUser() user: AuthTokenPayload): Promise<ProjectEntity[]> {
    return this.projectsService.findRecent(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a persisted project by id, including the full canvas JSON payload' })
  @ApiParam({ name: 'id', description: 'Project id in UUID format' })
  @ApiOkResponse({ type: ProjectResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid UUID or invalid request', type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Project not found' })
  getProjectById(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: AuthTokenPayload): Promise<ProjectEntity> {
    return this.projectsService.openProject(id, user.sub);
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

  @Post(':id/share')
  @ApiOperation({ summary: 'Enable public sharing for a project owned by the current user' })
  @ApiParam({ name: 'id', description: 'Project id in UUID format' })
  @ApiOkResponse({ type: ProjectShareResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid UUID', type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Project not found' })
  enableShare(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: AuthTokenPayload): Promise<ProjectShareResponseDto> {
    return this.projectsService.enableShare(id, user.sub);
  }

  @Delete(':id/share')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disable public sharing for a project owned by the current user' })
  @ApiParam({ name: 'id', description: 'Project id in UUID format' })
  @ApiNoContentResponse({ description: 'Project sharing disabled' })
  @ApiBadRequestResponse({ description: 'Invalid UUID', type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Project not found' })
  async disableShare(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: AuthTokenPayload): Promise<void> {
    await this.projectsService.disableShare(id, user.sub);
  }

  @Get(':id/export/:format')
  @ApiOperation({ summary: 'Export project data as JSON, PNG preview, or PDF summary' })
  @ApiParam({ name: 'id', description: 'Project id in UUID format' })
  @ApiParam({ name: 'format', enum: ['json', 'png', 'pdf'] })
  @ApiProduces('application/json', 'image/png', 'application/pdf')
  @ApiOkResponse({ description: 'Project export file stream' })
  @ApiBadRequestResponse({ description: 'Invalid UUID or format', type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Project not found' })
  async exportProject(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('format', new ParseEnumPipe(['json', 'png', 'pdf'])) format: ProjectExportFormat,
    @CurrentUser() user: AuthTokenPayload,
    @Res({ passthrough: true }) response: { setHeader: (name: string, value: string) => void }
  ): Promise<StreamableFile> {
    const file = await this.projectsService.exportProject(id, user.sub, format);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    return new StreamableFile(file.buffer);
  }
}
