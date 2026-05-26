import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseEnumPipe, ParseUUIDPipe, Post, Put, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
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
import { ProjectActor } from '../auth/auth.types';
import { ApiErrorResponseDto } from '../common/dto/api-error-response.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProjectAccessGuard } from '../auth/project-access.guard';
import { CurrentProjectActor } from '../auth/current-project-actor.decorator';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectShareDetailsResponseDto } from './dto/project-share-details-response.dto';
import { ProjectShareResponseDto } from './dto/project-share-response.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectExportFormat, ProjectsService, type ProjectView } from './projects.service';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(ProjectAccessGuard)
@Controller('api/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all persisted projects ordered by most recent open or update' })
  @ApiOkResponse({ type: ProjectResponseDto, isArray: true })
  getProjects(@CurrentProjectActor() actor: ProjectActor): Promise<ProjectView[]> {
    return this.projectsService.findAll(actor);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recently opened or edited projects for the current user' })
  @ApiOkResponse({ type: ProjectResponseDto, isArray: true })
  getRecentProjects(@CurrentProjectActor() actor: ProjectActor): Promise<ProjectView[]> {
    return this.projectsService.findRecent(actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a persisted project by id, including the full canvas JSON payload' })
  @ApiParam({ name: 'id', description: 'Project id in UUID format' })
  @ApiOkResponse({ type: ProjectResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid UUID or invalid request', type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Project not found' })
  getProjectById(@Param('id', new ParseUUIDPipe()) id: string, @CurrentProjectActor() actor: ProjectActor): Promise<ProjectView> {
    return this.projectsService.openProject(id, actor);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new persisted project from the current editor payload' })
  @ApiCreatedResponse({ type: ProjectResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed', type: ApiErrorResponseDto })
  createProject(@Body() dto: CreateProjectDto, @CurrentProjectActor() actor: ProjectActor): Promise<ProjectView> {
    return this.projectsService.create(dto, actor);
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
    @CurrentProjectActor() actor: ProjectActor
  ): Promise<ProjectView> {
    return this.projectsService.update(id, dto, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a persisted project' })
  @ApiParam({ name: 'id', description: 'Project id in UUID format' })
  @ApiNoContentResponse({ description: 'Project deleted' })
  @ApiBadRequestResponse({ description: 'Invalid UUID', type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Project not found' })
  async deleteProject(@Param('id', new ParseUUIDPipe()) id: string, @CurrentProjectActor() actor: ProjectActor): Promise<void> {
    await this.projectsService.remove(id, actor);
  }

  @Post(':id/share')
  @ApiOperation({ summary: 'Enable public sharing for a project owned by the current user' })
  @ApiParam({ name: 'id', description: 'Project id in UUID format' })
  @ApiOkResponse({ type: ProjectShareResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid UUID', type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Project not found' })
  enableShare(@Param('id', new ParseUUIDPipe()) id: string, @CurrentProjectActor() actor: ProjectActor): Promise<ProjectShareResponseDto> {
    return this.projectsService.enableShare(id, actor);
  }

  @Get(':id/share')
  @ApiOperation({ summary: 'Get share details and recent visitors for a project owned by the current user' })
  @ApiParam({ name: 'id', description: 'Project id in UUID format' })
  @ApiOkResponse({ type: ProjectShareDetailsResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid UUID', type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Project not found' })
  getShareDetails(@Param('id', new ParseUUIDPipe()) id: string, @CurrentProjectActor() actor: ProjectActor): Promise<ProjectShareDetailsResponseDto> {
    return this.projectsService.getShareDetails(id, actor);
  }

  @Delete(':id/share')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disable public sharing for a project owned by the current user' })
  @ApiParam({ name: 'id', description: 'Project id in UUID format' })
  @ApiNoContentResponse({ description: 'Project sharing disabled' })
  @ApiBadRequestResponse({ description: 'Invalid UUID', type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Project not found' })
  async disableShare(@Param('id', new ParseUUIDPipe()) id: string, @CurrentProjectActor() actor: ProjectActor): Promise<void> {
    await this.projectsService.disableShare(id, actor);
  }

  @Post('shared/:slug/clone')
  @ApiOperation({ summary: 'Clone a shared read-only project into my Drafts' })
  @ApiParam({ name: 'slug', description: 'Public project share slug' })
  @ApiCreatedResponse({ type: ProjectResponseDto })
  @ApiNotFoundResponse({ description: 'Shared project not found or disabled' })
  cloneSharedProject(@Param('slug') slug: string, @CurrentProjectActor() actor: ProjectActor): Promise<ProjectView> {
    return this.projectsService.cloneSharedProject(slug, actor);
  }

  @Get(':id/export/:format')
  @ApiOperation({ summary: 'Export project data as JSON, PNG preview, PDF summary, or WEBSTER bundle' })
  @ApiParam({ name: 'id', description: 'Project id in UUID format' })
  @ApiParam({ name: 'format', enum: ['json', 'png', 'pdf', 'webster'] })
  @ApiProduces('application/json', 'image/png', 'application/pdf', 'application/octet-stream')
  @ApiOkResponse({ description: 'Project export file stream' })
  @ApiBadRequestResponse({ description: 'Invalid UUID or format', type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Project not found' })
  async exportProject(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('format', new ParseEnumPipe(['json', 'png', 'pdf', 'webster'])) format: ProjectExportFormat,
    @CurrentProjectActor() actor: ProjectActor,
    @Res({ passthrough: true }) response: { setHeader: (name: string, value: string) => void }
  ): Promise<StreamableFile> {
    const file = await this.projectsService.exportProject(id, actor, format);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    return new StreamableFile(file.buffer);
  }

  @Post('import/webster')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Import a WEBSTER file and create a new project' })
  @ApiCreatedResponse({ type: ProjectResponseDto })
  @ApiBadRequestResponse({ description: 'Missing/invalid file', type: ApiErrorResponseDto })
  async importWebster(
    @UploadedFile() file: { buffer: Buffer; originalname?: string } | undefined,
    @CurrentProjectActor() actor: ProjectActor
  ): Promise<ProjectView> {
    if (!file?.buffer?.byteLength) {
      throw new BadRequestException('File is required.');
    }
    const baseName = (file.originalname || 'Imported project').replace(/\.webster$/i, '');
    return this.projectsService.importWebsterProject(file.buffer, actor, baseName);
  }
}
