import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';

class HealthResponseDto {
  @ApiProperty({ example: 'webster-server' })
  service!: string;

  @ApiProperty({ example: 'ok' })
  status!: string;

  @ApiProperty({ example: '2026-05-05T16:21:19.000Z' })
  timestamp!: string;
}

@ApiTags('Health')
@Controller('api/health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Get service health status' })
  @ApiOkResponse({ type: HealthResponseDto })
  getHealth(): HealthResponseDto {
    return {
      service: 'webster-server',
      status: 'ok',
      timestamp: new Date().toISOString()
    };
  }
}
