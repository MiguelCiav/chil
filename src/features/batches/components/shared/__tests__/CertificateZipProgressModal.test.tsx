import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CertificateZipProgressModal } from '../CertificateZipProgressModal';

describe('CertificateZipProgressModal component', () => {
  it('renders preparing state without counts when total is 0 and blocks backdrop dismissal', () => {
    const onCancel = vi.fn();

    render(
      <CertificateZipProgressModal
        isOpen={true}
        phase="preparing"
        progress={{ current: 0, total: 0, percentage: 0 }}
        isCancelling={false}
        scopeLabel="Lote #101"
        onCancel={onCancel}
      />
    );

    expect(screen.getByText('Generando certificados')).toBeInTheDocument();
    expect(screen.getByText('Lote #101')).toBeInTheDocument();
    expect(screen.getByText('Preparando lote...')).toBeInTheDocument();
    expect(screen.queryByLabelText('Cerrar modal')).not.toBeInTheDocument();

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    expect(progressbar).toHaveAttribute('aria-valuenow', '0');
    expect(progressbar).toHaveAttribute('aria-valuetext', 'Preparando lote...');

    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onCancel).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders rendering and compressing phases with X / Y (Z%) readout and aria-valuetext', () => {
    const onCancel = vi.fn();
    const { rerender } = render(
      <CertificateZipProgressModal
        isOpen={true}
        phase="rendering"
        progress={{ current: 12, total: 30, percentage: 40 }}
        isCancelling={false}
        scopeLabel="Grupo San Luis"
        onCancel={onCancel}
      />
    );

    expect(screen.getByText('Generando PDFs individuales...')).toBeInTheDocument();
    expect(screen.getByText('12 / 30 (40%)')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuetext',
      'Generando PDFs individuales... 12 / 30 (40%)'
    );

    rerender(
      <CertificateZipProgressModal
        isOpen={true}
        phase="compressing"
        progress={{ current: 30, total: 30, percentage: 100 }}
        isCancelling={false}
        scopeLabel="Grupo San Luis"
        onCancel={onCancel}
      />
    );

    expect(screen.getByText('Comprimiendo archivo ZIP...')).toBeInTheDocument();
    expect(screen.getByText('30 / 30 (100%)')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('shows Cancelando... status with disabled Cancelar button while aborting and unmounts after closing', async () => {
    const onCancel = vi.fn();
    const { rerender } = render(
      <CertificateZipProgressModal
        isOpen={true}
        phase="cancelling"
        progress={{ current: 15, total: 30, percentage: 50 }}
        isCancelling={true}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText('Cancelando...')).toBeInTheDocument();
    const cancelBtn = screen.getByRole('button', { name: 'Cancelar' });
    expect(cancelBtn).toBeDisabled();
    expect(cancelBtn).toHaveClass('ml-auto');

    rerender(
      <CertificateZipProgressModal
        isOpen={false}
        phase="cancelling"
        progress={{ current: 15, total: 30, percentage: 50 }}
        isCancelling={false}
        onCancel={onCancel}
      />
    );

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
