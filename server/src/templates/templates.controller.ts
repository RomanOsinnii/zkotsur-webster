import { Body, Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiParam, ApiProperty, ApiTags } from '@nestjs/swagger';

type TemplateItem = {
  id: string;
  name: string;
  category: string;
  width: number;
  height: number;
};

class TemplateDto {
  @ApiProperty({ example: 'tpl_32f4a' })
  id!: string;

  @ApiProperty({ example: 'Instagram Post' })
  name!: string;

  @ApiProperty({ example: 'social' })
  category!: string;

  @ApiProperty({ example: 1080 })
  width!: number;

  @ApiProperty({ example: 1080 })
  height!: number;
}

class CreateTemplateDto {
  @ApiProperty({ example: 'YouTube Thumbnail' })
  name!: string;

  @ApiProperty({ example: 'video' })
  category!: string;

  @ApiProperty({ example: 1280 })
  width!: number;

  @ApiProperty({ example: 720 })
  height!: number;
}

function createId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `tpl_${Math.random().toString(36).slice(2, 8)}`;
}

@ApiTags('Templates')
@Controller('api/templates')
export class TemplatesController {
  private readonly templates: TemplateItem[] = [
    { id: createId(), name: 'Instagram Post', category: 'social', width: 1080, height: 1080 },
    { id: createId(), name: 'Facebook Cover', category: 'social', width: 820, height: 312 },
    { id: createId(), name: 'YouTube Thumbnail', category: 'video', width: 1280, height: 720 }
  ];

  @Get()
  @ApiOperation({ summary: 'Get all templates' })
  @ApiOkResponse({ type: TemplateDto, isArray: true })
  getTemplates(): TemplateItem[] {
    return this.templates;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template by id' })
  @ApiParam({ name: 'id', description: 'Template id' })
  @ApiOkResponse({ type: TemplateDto })
  getTemplateById(@Param('id') id: string): TemplateItem {
    const template = this.templates.find((item) => item.id === id);
    if (!template) {
      throw new NotFoundException(`Template with id '${id}' was not found`);
    }

    return template;
  }

  @Post()
  @ApiOperation({ summary: 'Create a template' })
  @ApiCreatedResponse({ type: TemplateDto })
  createTemplate(@Body() dto: CreateTemplateDto): TemplateItem {
    const next: TemplateItem = {
      id: createId(),
      name: dto.name,
      category: dto.category,
      width: dto.width,
      height: dto.height
    };

    this.templates.unshift(next);
    return next;
  }
}
