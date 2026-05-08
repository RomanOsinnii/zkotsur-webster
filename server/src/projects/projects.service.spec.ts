import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectEntity } from './project.entity';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let repository: jest.Mocked<Repository<ProjectEntity>>;
  const ownerId = 'user-1';

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getRepositoryToken(ProjectEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn()
          }
        }
      ]
    }).compile();

    service = moduleRef.get(ProjectsService);
    repository = moduleRef.get(getRepositoryToken(ProjectEntity));
  });

  it('creates a project using the repository', async () => {
    const payload = {
      name: 'Demo project',
      description: 'Stored in postgres',
      data: { frames: [] }
    };
    const created = {
      id: 'project-1',
      ...payload,
      owner: { id: ownerId },
      ownerId,
      createdAt: new Date(),
      updatedAt: new Date()
    } as unknown as ProjectEntity;

    repository.create.mockReturnValue(created);
    repository.save.mockResolvedValue(created);

    await expect(service.create(payload, ownerId)).resolves.toEqual(created);
    expect(repository.create).toHaveBeenCalledWith({
      ...payload,
      owner: { id: ownerId }
    });
    expect(repository.save).toHaveBeenCalledWith(created);
  });

  it('throws when a project is missing', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findOne('missing-id', ownerId)).rejects.toBeInstanceOf(NotFoundException);
  });
});
