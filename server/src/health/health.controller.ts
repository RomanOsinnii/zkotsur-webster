import { Controller, Get } from '@nestjs/common';

@Controller('api/health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      service: 'webster-server',
      status: 'ok',
      timestamp: new Date().toISOString()
    };
  }
}
