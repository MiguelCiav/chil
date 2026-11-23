import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScraperSettingsProvider, useScraperSettings } from '../ScraperSettingsContext';
import * as batchesApi from '../../features/batches/api';

vi.mock('../../features/auth', () => ({
  useAuth: vi.fn(() => ({
    user: { uid: 'user-1', email: 'coord@scouts.org.ve' }
  }))
}));

vi.mock('../../features/batches/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../features/batches/api')>();
  return {
    ...actual,
    getScraperSessionStatus: vi.fn(),
    purgeLegacyScraperStorage: vi.fn()
  };
});

const StatusConsumer: React.FC = () => {
  const { sessionStatus, isLoadingStatus } = useScraperSettings();
  return (
    <div>
      <span data-testid="loading">{String(isLoadingStatus)}</span>
      <span data-testid="status">{sessionStatus?.status ?? 'null'}</span>
      <span data-testid="email">{sessionStatus?.impeesaEmail ?? 'none'}</span>
    </div>
  );
};

describe('ScraperSettingsContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deduplicates concurrent mount fetches under React StrictMode into a single getScraperSessionStatus call', async () => {
    let resolveStatus!: (val: batchesApi.ScraperSessionStatus) => void;
    vi.mocked(batchesApi.getScraperSessionStatus).mockImplementation(
      () =>
        new Promise<batchesApi.ScraperSessionStatus>((resolve) => {
          resolveStatus = resolve;
        })
    );

    render(
      <React.StrictMode>
        <ScraperSettingsProvider>
          <StatusConsumer />
        </ScraperSettingsProvider>
      </React.StrictMode>
    );

    expect(batchesApi.getScraperSessionStatus).toHaveBeenCalledTimes(1);

    resolveStatus({
      connected: true,
      status: 'active',
      impeesaEmail: 'impeesa@scouts.org.ve',
      updatedAt: '2026-11-22T12:00:00.000Z'
    });

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('active');
      expect(screen.getByTestId('email').textContent).toBe('impeesa@scouts.org.ve');
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
  });
});
