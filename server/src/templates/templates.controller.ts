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
  ApiTags,
  ApiUnauthorizedResponse
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiErrorResponseDto } from '../common/dto/api-error-response.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { TemplateResponseDto } from './dto/template-response.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TemplateEntity } from './template.entity';
import { TemplatesService } from './templates.service';

@ApiTags('Templates')
@Controller('api/templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all templates' })
  @ApiOkResponse({ type: TemplateResponseDto, isArray: true })
  getTemplates(): Promise<TemplateEntity[]> {
    return this.templatesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template by id' })
  @ApiParam({ name: 'id', description: 'Template id in UUID format' })
  @ApiOkResponse({ type: TemplateResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid UUID or invalid request', type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Template not found' })
  getTemplateById(@Param('id', new ParseUUIDPipe()) id: string): Promise<TemplateEntity> {
    return this.templatesService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a template' })
  @ApiCreatedResponse({ type: TemplateResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed', type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token', type: ApiErrorResponseDto })
  createTemplate(@Body() dto: CreateTemplateDto): Promise<TemplateEntity> {
    return this.templatesService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a template' })
  @ApiParam({ name: 'id', description: 'Template id in UUID format' })
  @ApiOkResponse({ type: TemplateResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid UUID or validation failed', type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Template not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token', type: ApiErrorResponseDto })
  updateTemplate(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateTemplateDto): Promise<TemplateEntity> {
    return this.templatesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a template' })
  @ApiParam({ name: 'id', description: 'Template id in UUID format' })
  @ApiNoContentResponse({ description: 'Template deleted' })
  @ApiBadRequestResponse({ description: 'Invalid UUID', type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ description: 'Template not found' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token', type: ApiErrorResponseDto })
  async deleteTemplate(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.templatesService.remove(id);
  }
}
