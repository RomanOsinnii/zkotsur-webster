import { ApiProperty } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TemplateResponseDto {
  @ApiProperty({ example: 'c6e7b8bc-f0ee-4eef-9277-8b57b8cb8ad8' })
  id!: string;

  @ApiProperty({ example: 'Instagram Post' })
  name!: string;

  @ApiProperty({ example: 'social' })
  category!: string;

  @ApiProperty({ example: 1080 })
  width!: number;

  @ApiProperty({ example: 1080 })
  height!: number;

  @ApiPropertyOptional({ example: { frames: [] } })
  data?: Record<string, unknown> | null;
}
