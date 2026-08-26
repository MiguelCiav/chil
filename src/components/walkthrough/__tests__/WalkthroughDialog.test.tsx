import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WalkthroughDialog } from '../WalkthroughDialog';
import { WalkthroughStep } from '../types';

describe('WalkthroughDialog component', () => {
  const mockStep: WalkthroughStep = {
    id: 'test-step',
    targetSelector: '#target',
    title: 'Paso de Prueba',
    content: 'Este es el texto explicativo del paso.',
    placement: 'bottom'
  };

  const defaultProps = {
    step: mockStep,
    stepIndex: 0,
    totalSteps: 4,
    targetRect: null,
    onNext: vi.fn(),
    onPrev: vi.fn(),
    onSkip: vi.fn(),
    onClose: vi.fn()
  };

  it('renders step details, default badge, title, content and control buttons', () => {
    render(<WalkthroughDialog {...defaultProps} />);

    expect(screen.getByText('Paso 1 de 4')).toBeInTheDocument();
    expect(screen.getByText('Paso de Prueba')).toBeInTheDocument();
    expect(screen.getByText('Este es el texto explicativo del paso.')).toBeInTheDocument();

    const skipBtn = screen.getByRole('button', { name: /Omitir guía/i });
    const prevBtn = screen.getByRole('button', { name: /◀ Anterior/i });
    const nextBtn = screen.getByRole('button', { name: /Siguiente ▶/i });
    const closeBtn = screen.getByRole('button', { name: /Cerrar guía/i });

    expect(skipBtn).toBeInTheDocument();
    expect(prevBtn).toBeInTheDocument();
    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeInTheDocument();
    expect(closeBtn).toBeInTheDocument();
  });

  it('uses custom badge when provided in step', () => {
    const stepWithBadge: WalkthroughStep = {
      ...mockStep,
      badge: 'Nivel 1'
    };

    render(<WalkthroughDialog {...defaultProps} step={stepWithBadge} />);
    expect(screen.getByText('Nivel 1')).toBeInTheDocument();
    expect(screen.queryByText('Paso 1 de 4')).not.toBeInTheDocument();
  });

  it('handles button clicks: next, prev, skip, close', () => {
    const onNext = vi.fn();
    const onPrev = vi.fn();
    const onSkip = vi.fn();
    const onClose = vi.fn();

    render(
      <WalkthroughDialog
        {...defaultProps}
        stepIndex={1}
        onNext={onNext}
        onPrev={onPrev}
        onSkip={onSkip}
        onClose={onClose}
      />
    );

    const prevBtn = screen.getByRole('button', { name: /◀ Anterior/i });
    expect(prevBtn).toBeEnabled();
    fireEvent.click(prevBtn);
    expect(onPrev).toHaveBeenCalledTimes(1);

    const nextBtn = screen.getByRole('button', { name: /Siguiente ▶/i });
    fireEvent.click(nextBtn);
    expect(onNext).toHaveBeenCalledTimes(1);

    const skipBtn = screen.getByRole('button', { name: /Omitir guía/i });
    fireEvent.click(skipBtn);
    expect(onSkip).toHaveBeenCalledTimes(1);

    const closeBtn = screen.getByRole('button', { name: /Cerrar guía/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('displays "¡Entendido!" button label on the last step', () => {
    const onNext = vi.fn();
    render(
      <WalkthroughDialog
        {...defaultProps}
        stepIndex={3}
        totalSteps={4}
        onNext={onNext}
      />
    );

    const finishBtn = screen.getByRole('button', { name: /¡Entendido!/i });
    expect(finishBtn).toBeInTheDocument();
    fireEvent.click(finishBtn);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('positions dialog next to target rect and triggers onPositionChange callback', () => {
    const onPositionChange = vi.fn();
    const mockRect = {
      top: 100,
      left: 100,
      width: 200,
      height: 50,
      bottom: 150,
      right: 300,
      x: 100,
      y: 100,
      toJSON: () => { }
    } as DOMRect;

    render(
      <WalkthroughDialog
        {...defaultProps}
        targetRect={mockRect}
        onPositionChange={onPositionChange}
      />
    );

    expect(onPositionChange).toHaveBeenCalledWith(
      expect.objectContaining({
        top: expect.any(Number),
        left: expect.any(Number),
        width: expect.any(Number),
        height: expect.any(Number),
        placement: expect.any(String)
      })
    );
  });
});
