import { ApiProperty } from '@nestjs/swagger';

export class RegisterResponseDto {
  @ApiProperty({ example: true })
  requiresEmailVerification!: boolean;

  @ApiProperty({ example: 'Account created. Check your email to verify your account.' })
  message!: string;
}
