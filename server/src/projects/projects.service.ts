import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectEntity } from './project.entity';
import { UserEntity } from '../users/user.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectsRepository: Repository<ProjectEntity>
  ) {}

  findAll(ownerId: string): Promise<ProjectEntity[]> {
    return this.projectsRepository.find({
      where: { owner: { id: ownerId } },
      order: { updatedAt: 'DESC' }
    });
  }

  async findOne(id: string, ownerId: string): Promise<ProjectEntity> {
    const project = await this.projectsRepository.findOne({ where: { id, owner: { id: ownerId } } });
    if (!project) {
      throw new NotFoundException(`Project with id '${id}' was not found`);
    }

    return project;
  }

  async create(dto: CreateProjectDto, ownerId: string): Promise<ProjectEntity> {
    const project = this.projectsRepository.create({
      name: dto.name,
      description: dto.description?.trim() || null,
      data: dto.data,
      owner: { id: ownerId } as UserEntity
    });

    return this.projectsRepository.save(project);
  }

  async update(id: string, dto: UpdateProjectDto, ownerId: string): Promise<ProjectEntity> {
    const project = await this.findOne(id, ownerId);

    if (dto.name !== undefined) {
      project.name = dto.name;
    }
    if (dto.description !== undefined) {
      project.description = dto.description?.trim() || null;
    }
    if (dto.data !== undefined) {
      project.data = dto.data;
    }

    return this.projectsRepository.save(project);
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const project = await this.findOne(id, ownerId);
    await this.projectsRepository.remove(project);
  }
}
