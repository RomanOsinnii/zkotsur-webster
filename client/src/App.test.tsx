import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the main heading', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          service: 'webster-server',
          status: 'ok',
          timestamp: '2026-04-25T00:00:00.000Z'
        })
      })
    );

    render(<App />);

    expect(
      screen.getByRole('heading', { name: /graphic design platform starter/i })
    ).toBeInTheDocument();

    expect(await screen.findByText(/ok at/i)).toBeInTheDocument();
  });
});
