import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
  const { sessionStatus, isLoadingStatus, openModal, refreshSessionStatus } = useScraperSettings();
  return (
    <div>
      <span data-testid="loading">{String(isLoadingStatus)}</span>
      <span data-testid="status">{sessionStatus?.status ?? 'null'}</span>
      <span data-testid="email">{sessionStatus?.impeesaEmail ?? 'none'}</span>
      <button type="button" onClick={() => openModal()}>
        Open Modal
      </button>
      <button
        type="button"
        onClick={() => {
          void refreshSessionStatus();
          void refreshSessionStatus();
        }}
      >
        Refresh Twice
      </button>
    </div>
  );
};

describe('ScraperSettingsContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('does not fetch getScraperSessionStatus eagerly on mount when localStorage cache is absent', () => {
    render(
      <React.StrictMode>
        <ScraperSettingsProvider>
          <StatusConsumer />
        </ScraperSettingsProvider>
      </React.StrictMode>
    );

    expect(batchesApi.getScraperSessionStatus).not.toHaveBeenCalled();
    expect(screen.getByTestId('status').textContent).toBe('null');
    expect(screen.getByTestId('loading').textContent).toBe('false');
  });

  it('hydrates immediately from fresh localStorage cache with 0 backend calls', () => {
    window.localStorage.setItem(
      'chil_scraper_status_user-1',
      JSON.stringify({
        status: {
          connected: true,
          status: 'active',
          impeesaEmail: 'cached@scouts.org.ve',
          updatedAt: '2026-11-24T10:00:00.000Z'
        },
        cachedAt: Date.now()
      })
    );

    render(
      <ScraperSettingsProvider>
        <StatusConsumer />
      </ScraperSettingsProvider>
    );

    expect(batchesApi.getScraperSessionStatus).not.toHaveBeenCalled();
    expect(screen.getByTestId('status').textContent).toBe('active');
    expect(screen.getByTestId('email').textContent).toBe('cached@scouts.org.ve');

    // Opening modal when already hydrated does not trigger a redundant fetch
    fireEvent.click(screen.getByRole('button', { name: 'Open Modal' }));
    expect(batchesApi.getScraperSessionStatus).not.toHaveBeenCalled();
  });

  it('lazily fetches when opening modal and deduplicates concurrent refreshSessionStatus calls', async () => {
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

    expect(batchesApi.getScraperSessionStatus).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh Twice' }));
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

    const cachedRaw = window.localStorage.getItem('chil_scraper_status_user-1');
    expect(cachedRaw).toContain('impeesa@scouts.org.ve');
  });
});
