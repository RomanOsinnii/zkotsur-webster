import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNotEmptyObject, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'Brand Kit' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'Presentation assets for the final demo', required: false, nullable: true })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    example: {
      frames: [
        {
          id: 'frame-1',
          name: 'Presentation',
          width: 1280,
          height: 720,
          json: { objects: [] }
        }
      ]
    }
  })
  @IsNotEmptyObject()
  @IsObject()
  data!: Record<string, unknown>;
}
