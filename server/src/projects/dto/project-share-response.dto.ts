import { ApiProperty } from '@nestjs/swagger';

export class ProjectShareResponseDto {
  @ApiProperty({ example: true })
  isPublic!: boolean;

  @ApiProperty({ example: 'c0ffee12beef34aa', required: false, nullable: true })
  shareSlug!: string | null;

  @ApiProperty({ example: '/shared/c0ffee12beef34aa', required: false, nullable: true })
  sharePath!: string | null;
}
