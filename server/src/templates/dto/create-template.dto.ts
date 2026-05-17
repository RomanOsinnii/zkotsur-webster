import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString, MaxLength, Min } from 'class-validator';

export class CreateTemplateDto {
  @ApiProperty({ example: 'YouTube Thumbnail' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'video' })
  @IsString()
  @MaxLength(80)
  category!: string;

  @ApiProperty({ example: 1280 })
  @IsInt()
  @IsPositive()
  @Min(1)
  width!: number;

  @ApiProperty({ example: 720 })
  @IsInt()
  @IsPositive()
  @Min(1)
  height!: number;

  @ApiPropertyOptional({
    example: { frames: [] },
    description: 'Optional editor project snapshot used when this template is applied'
  })
  @IsOptional()
  data?: Record<string, unknown>;
}
