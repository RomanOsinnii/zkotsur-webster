import { ApiProperty } from '@nestjs/swagger';

class ShareVisitorDto {
  @ApiProperty({ example: 'Roman' })
  username!: string;

  @ApiProperty({ example: '2026-05-24T10:42:00.000Z' })
  visitedAt!: string;
}

export class ProjectShareDetailsResponseDto {
  @ApiProperty({ example: true })
  isPublic!: boolean;

  @ApiProperty({ example: 'c0ffee12beef34aa', required: false, nullable: true })
  shareSlug!: string | null;

  @ApiProperty({ example: '/shared/c0ffee12beef34aa', required: false, nullable: true })
  sharePath!: string | null;

  @ApiProperty({ type: ShareVisitorDto, isArray: true })
  visitors!: ShareVisitorDto[];
}
