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
      name: payload.name,
      description: payload.description,
      lastOpenedAt: new Date(),
      isPublic: false,
      shareSlug: null,
      dataPath: null,
      createdAt: new Date(),
      updatedAt: new Date()
    } as unknown as ProjectEntity;
    const savedWithPath = {
      ...created,
      dataPath: `${process.cwd()}\\storage\\projects\\${ownerId}\\project-1.json`
    } as unknown as ProjectEntity;

    repository.create.mockReturnValue(created);
    repository.save
      .mockResolvedValueOnce(created)
      .mockResolvedValueOnce(savedWithPath);

    await expect(service.create(payload, ownerId)).resolves.toEqual(expect.objectContaining({
      id: 'project-1',
      name: payload.name,
      description: payload.description,
      data: payload.data,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt
    }));
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      name: payload.name,
      description: payload.description,
      owner: { id: ownerId }
    }));
    expect(repository.save).toHaveBeenCalledTimes(2);
  });

  it('throws when a project is missing', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findOne('missing-id', ownerId)).rejects.toBeInstanceOf(NotFoundException);
  });
});
