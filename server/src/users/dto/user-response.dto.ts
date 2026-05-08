import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: 'aa2762ef-f09f-4281-926a-285ce0c9204c' })
  id!: string;

  @ApiProperty({ example: 'Webster Student' })
  name!: string;

  @ApiProperty({ example: 'student@example.com' })
  email!: string;

  @ApiProperty({ example: '2026-05-08T17:42:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-05-08T18:10:00.000Z' })
  updatedAt!: Date;
}
