import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TemplateEntity } from './template.entity';

const starterTemplates: Array<Pick<TemplateEntity, 'name' | 'category' | 'width' | 'height'>> = [
  { name: 'Instagram Post', category: 'social', width: 1080, height: 1080 },
  { name: 'Instagram Story', category: 'social', width: 1080, height: 1920 },
  { name: 'Facebook Cover', category: 'social', width: 820, height: 312 },
  { name: 'YouTube Thumbnail', category: 'video', width: 1280, height: 720 },
  { name: 'Photo Collages', category: 'photo', width: 1080, height: 1080 },
  { name: 'Greeting Card', category: 'print', width: 1200, height: 800 },
  { name: 'Invitation', category: 'print', width: 1080, height: 1350 },
  { name: 'Postcard', category: 'print', width: 1480, height: 1050 }
];

@Injectable()
export class TemplatesService implements OnModuleInit {
  constructor(
    @InjectRepository(TemplateEntity)
    private readonly templatesRepository: Repository<TemplateEntity>
  ) {}

  async onModuleInit(): Promise<void> {
    const existing = await this.templatesRepository.find();
    const existingKeys = new Set(existing.map((template) => this.buildTemplateKey(template)));

    const missingTemplates = starterTemplates.filter((template) => !existingKeys.has(this.buildTemplateKey(template)));
    if (!missingTemplates.length) {
      return;
    }

    await this.templatesRepository.insert(missingTemplates);
  }

  findAll(): Promise<TemplateEntity[]> {
    return this.templatesRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<TemplateEntity> {
    const template = await this.templatesRepository.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException(`Template with id '${id}' was not found`);
    }

    return template;
  }

  async create(dto: CreateTemplateDto): Promise<TemplateEntity> {
    const template = this.templatesRepository.create({
      name: dto.name,
      category: dto.category,
      width: dto.width,
      height: dto.height,
      data: dto.data ?? null
    });

    return this.templatesRepository.save(template);
  }

  async update(id: string, dto: UpdateTemplateDto): Promise<TemplateEntity> {
    const template = await this.findById(id);

    if (dto.name !== undefined) template.name = dto.name;
    if (dto.category !== undefined) template.category = dto.category;
    if (dto.width !== undefined) template.width = dto.width;
    if (dto.height !== undefined) template.height = dto.height;
    if (dto.data !== undefined) template.data = dto.data;

    return this.templatesRepository.save(template);
  }

  async remove(id: string): Promise<void> {
    const template = await this.findById(id);
    await this.templatesRepository.remove(template);
  }

  private buildTemplateKey(template: Pick<TemplateEntity, 'name' | 'category' | 'width' | 'height'>): string {
    return `${template.name.toLowerCase()}|${template.category.toLowerCase()}|${template.width}x${template.height}`;
  }
}
