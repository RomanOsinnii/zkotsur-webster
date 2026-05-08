import { ApiProperty } from '@nestjs/swagger';

export class ApiErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ example: ['name should not be empty'] })
  message!: string | string[];

  @ApiProperty({ example: 'Bad Request' })
  error!: string;
}
