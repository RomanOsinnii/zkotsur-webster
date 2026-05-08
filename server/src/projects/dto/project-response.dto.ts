import { ApiProperty } from '@nestjs/swagger';

export class ProjectResponseDto {
  @ApiProperty({ example: '3dd4ce55-a87f-4bd2-8bdf-cf7d8a4df4e0' })
  id!: string;

  @ApiProperty({ example: 'Summer Campaign' })
  name!: string;

  @ApiProperty({ example: 'Instagram launch assets', required: false, nullable: true })
  description!: string | null;

  @ApiProperty({
    description: 'Full editor payload persisted as JSONB. This includes every frame and its Fabric canvas JSON.',
    example: {
      frames: [
        {
          id: 'frame-1',
          name: 'Instagram Post',
          width: 1080,
          height: 1080,
          json: { objects: [] }
        }
      ]
    }
  })
  data!: Record<string, unknown>;

  @ApiProperty({ example: '2026-05-08T17:42:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-05-08T18:10:00.000Z' })
  updatedAt!: Date;
}
