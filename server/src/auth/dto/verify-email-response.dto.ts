import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailResponseDto {
  @ApiProperty({ example: true })
  ok!: boolean;

  @ApiProperty({ example: 'student@example.com' })
  email!: string;

  @ApiProperty({ example: 'Email confirmed. You can now log in.' })
  message!: string;
}
