import { Body, Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiProperty, ApiTags } from '@nestjs/swagger';

type ProjectItem = {
  id: string;
  name: string;
  frameCount: number;
  updatedAt: string;
};

class ProjectDto {
  @ApiProperty({ example: 'prj_d39a1' })
  id!: string;

  @ApiProperty({ example: 'Summer Campaign' })
  name!: string;

  @ApiProperty({ example: 6 })
  frameCount!: number;

  @ApiProperty({ example: '2026-05-05T16:21:19.000Z' })
  updatedAt!: string;
}

class CreateProjectDto {
  @ApiProperty({ example: 'Brand Kit' })
  name!: string;

  @ApiProperty({ example: 1, description: 'Initial number of frames' })
  frameCount!: number;
}

function createId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `prj_${Math.random().toString(36).slice(2, 8)}`;
}

@ApiTags('Projects')
@Controller('api/projects')
export class ProjectsController {
  private readonly projects: ProjectItem[] = [
    { id: createId(), name: 'Main Demo Project', frameCount: 3, updatedAt: new Date().toISOString() }
  ];

  @Get()
  @ApiOperation({ summary: 'Get all projects' })
  @ApiOkResponse({ type: ProjectDto, isArray: true })
  getProjects(): ProjectItem[] {
    return this.projects;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by id' })
  @ApiParam({ name: 'id', description: 'Project id' })
  @ApiOkResponse({ type: ProjectDto })
  getProjectById(@Param('id') id: string): ProjectItem {
    const project = this.projects.find((item) => item.id === id);
    if (!project) {
      throw new NotFoundException(`Project with id '${id}' was not found`);
    }

    return project;
  }

  @Post()
  @ApiOperation({ summary: 'Create project' })
  @ApiCreatedResponse({ type: ProjectDto })
  createProject(@Body() dto: CreateProjectDto): ProjectItem {
    const next: ProjectItem = {
      id: createId(),
      name: dto.name,
      frameCount: dto.frameCount,
      updatedAt: new Date().toISOString()
    };

    this.projects.unshift(next);
    return next;
  }
}
