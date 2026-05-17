import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateMeDto {
  @ApiPropertyOptional({ example: 'Webster Student' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    description: 'Avatar image as data URL. Send an empty string to remove avatar.',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...'
  })
  @IsOptional()
  @IsString()
  @MaxLength(1_500_000)
  @Matches(/^$|^data:image\/(png|jpe?g|webp);base64,[a-zA-Z0-9+/=]+$/, {
    message: 'avatarUrl must be a valid image data URL or an empty string'
  })
  avatarUrl?: string;
}