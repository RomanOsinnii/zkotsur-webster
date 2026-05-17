import { ApiProperty } from '@nestjs/swagger';

export class RequestPasswordResetResponseDto {
  @ApiProperty({ example: true })
  ok!: boolean;

  @ApiProperty({ example: 'If an account exists for this email, a password reset email has been sent.' })
  message!: string;
}
