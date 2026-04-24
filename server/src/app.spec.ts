import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';
import { HealthController } from './health/health.controller';

describe('HealthController', () => {
  it('returns ok status', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    const controller = moduleRef.get(HealthController);
    const response = controller.getHealth();

    expect(response.service).toBe('webster-server');
    expect(response.status).toBe('ok');
    expect(response.timestamp).toEqual(expect.any(String));
  });
});
