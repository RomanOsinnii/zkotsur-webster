import { HealthController } from './health/health.controller';

describe('HealthController', () => {
  it('returns ok status', () => {
    const controller = new HealthController();
    const response = controller.getHealth();

    expect(response.service).toBe('webster-server');
    expect(response.status).toBe('ok');
    expect(response.timestamp).toEqual(expect.any(String));
  });
});
