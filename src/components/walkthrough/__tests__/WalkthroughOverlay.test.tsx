import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WalkthroughOverlay } from '../WalkthroughOverlay';
import { WalkthroughStep } from '../types';

describe('WalkthroughOverlay component', () => {
  const mockStep: WalkthroughStep = {
    id: 'step-overlay-test',
    targetSelector: '#some-element',
    title: 'Overlay Step Title',
    content: 'Overlay Step Narrative Content',
    placement: 'bottom'
  };

  const defaultProps = {
    isOpen: true,
    currentStep: mockStep,
    currentStepIndex: 0,
    totalSteps: 3,
    targetRect: null,
    onNext: vi.fn(),
    onPrev: vi.fn(),
    onSkip: vi.fn(),
    onClose: vi.fn()
  };

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<WalkthroughOverlay {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when currentStep is null', () => {
    const { container } = render(<WalkthroughOverlay {...defaultProps} currentStep={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders fixed overlay and dialog when isOpen is true', () => {
    render(<WalkthroughOverlay {...defaultProps} />);

    const overlay = screen.getByTestId('walkthrough-overlay');
    expect(overlay).toBeInTheDocument();
    expect(screen.getByText('Overlay Step Title')).toBeInTheDocument();
    expect(screen.getByText('Overlay Step Narrative Content')).toBeInTheDocument();
  });

  it('renders glowing target highlight box when targetRect is provided', () => {
    const mockRect = {
      top: 150,
      left: 80,
      width: 300,
      height: 100,
      bottom: 250,
      right: 380,
      x: 80,
      y: 150,
      toJSON: () => {}
    } as DOMRect;

    render(<WalkthroughOverlay {...defaultProps} targetRect={mockRect} />);

    const highlight = screen.getByTestId('walkthrough-highlight-box');
    expect(highlight).toBeInTheDocument();
    // 6px padding around targetRect: top = 150 - 6 = 144px, left = 80 - 6 = 74px, width = 300 + 12 = 312px, height = 100 + 12 = 112px
    expect(highlight).toHaveStyle({
      top: '144px',
      left: '74px',
      width: '312px',
      height: '112px'
    });
  });

  it('forwards action callbacks to nested WalkthroughDialog', () => {
    const onNext = vi.fn();
    const onPrev = vi.fn();
    const onSkip = vi.fn();
    const onClose = vi.fn();

    render(
      <WalkthroughOverlay
        {...defaultProps}
        currentStepIndex={1}
        onNext={onNext}
        onPrev={onPrev}
        onSkip={onSkip}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Siguiente ▶/i }));
    expect(onNext).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /◀ Anterior/i }));
    expect(onPrev).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Omitir guía/i }));
    expect(onSkip).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Cerrar guía/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
