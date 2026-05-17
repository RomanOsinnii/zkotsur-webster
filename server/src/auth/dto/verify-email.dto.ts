import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ example: 'f2d4aa9f...' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  token!: string;
}
