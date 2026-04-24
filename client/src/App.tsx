import { useEffect, useState } from 'react';

type HealthResponse = {
  service: string;
  status: string;
  timestamp: string;
};

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHealth(): Promise<void> {
      try {
        const response = await fetch('/api/health');

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = (await response.json()) as HealthResponse;
        setHealth(data);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Unknown error');
      }
    }

    void loadHealth();
  }, []);

  return (
    <main className="app-shell">
      <section className="panel">
        <p className="eyebrow">Webster</p>
        <h1>Graphic design platform starter</h1>
        <p className="lead">
          Frontend container is connected to the Nest API. Use this as the base for the
          product surface and internal tools.
        </p>

        <div className="status-card">
          <span className="label">API status</span>
          {health ? (
            <strong className="success">
              {health.status} at {new Date(health.timestamp).toLocaleString()}
            </strong>
          ) : (
            <strong className="muted">Checking connection…</strong>
          )}
          {error ? <p className="error">{error}</p> : null}
        </div>
      </section>
    </main>
  );
}
