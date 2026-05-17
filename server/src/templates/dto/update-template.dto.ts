import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator';

export class UpdateTemplateDto {
  @ApiPropertyOptional({ example: 'YouTube Thumbnail Pro' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: 'video' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @ApiPropertyOptional({ example: 1280 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Min(1)
  width?: number;

  @ApiPropertyOptional({ example: 720 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Min(1)
  height?: number;

  @ApiPropertyOptional({
    example: { frames: [] },
    description: 'Optional editor project snapshot used when this template is applied'
  })
  @IsOptional()
  data?: Record<string, unknown>;
}