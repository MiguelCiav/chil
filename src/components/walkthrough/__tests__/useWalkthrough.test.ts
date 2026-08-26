import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useWalkthrough } from '../useWalkthrough';
import { TourConfig, WalkthroughStep } from '../types';

describe('useWalkthrough hook', () => {
  const mockSteps: WalkthroughStep[] = [
    {
      id: 'step-1',
      targetSelector: '[data-testid="target-1"]',
      title: 'Step 1 Title',
      content: 'Step 1 Content',
      placement: 'bottom'
    },
    {
      id: 'step-2',
      targetSelector: '[data-testid="target-2"]',
      title: 'Step 2 Title',
      content: 'Step 2 Content',
      placement: 'top'
    },
    {
      id: 'step-3',
      targetSelector: '[data-testid="target-3"]',
      title: 'Step 3 Title',
      content: 'Step 3 Content',
      placement: 'right'
    }
  ];

  const defaultConfig: TourConfig = {
    tourId: 'test-tour',
    steps: mockSteps,
    userId: 'user-123',
    autoStartDelay: 50
  };

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with default state and auto-starts when not seen before', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useWalkthrough({ ...defaultConfig, onComplete })
    );

    // Initial state before autoStartDelay
    expect(result.current.isOpen).toBe(false);
    expect(result.current.currentStepIndex).toBe(0);
    expect(result.current.totalSteps).toBe(3);
    expect(result.current.isFirstStep).toBe(true);
    expect(result.current.isLastStep).toBe(false);

    // Advance timer past autoStartDelay
    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.currentStep?.id).toBe('step-1');
  });

  it('does NOT auto-start if tour was previously completed or skipped', () => {
    localStorage.setItem('chil_tour_test-tour_user-123', 'true');

    const { result } = renderHook(() =>
      useWalkthrough(defaultConfig)
    );

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.currentStep).toBeNull();
  });

  it('does NOT auto-start on mount when autoStart is false, but allows manual startTour', () => {
    const { result } = renderHook(() =>
      useWalkthrough({ ...defaultConfig, autoStart: false })
    );

    // Should remain closed even after delay
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.currentStep).toBeNull();

    // Can still be opened manually
    act(() => {
      result.current.startTour(0);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.currentStepIndex).toBe(0);
    expect(result.current.currentStep?.id).toBe('step-1');
  });

  it('allows manual startTour at a specific step index', () => {
    localStorage.setItem('chil_tour_test-tour_user-123', 'true');

    const { result } = renderHook(() =>
      useWalkthrough(defaultConfig)
    );

    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.startTour(1);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.currentStepIndex).toBe(1);
    expect(result.current.currentStep?.id).toBe('step-2');
  });

  it('navigates next and prev steps accurately', () => {
    const { result } = renderHook(() =>
      useWalkthrough(defaultConfig)
    );

    act(() => {
      result.current.startTour(0);
    });

    expect(result.current.currentStepIndex).toBe(0);
    expect(result.current.isFirstStep).toBe(true);

    // Advance to step 2
    act(() => {
      result.current.nextStep();
    });

    expect(result.current.currentStepIndex).toBe(1);
    expect(result.current.isFirstStep).toBe(false);
    expect(result.current.isLastStep).toBe(false);

    // Advance to step 3 (last step)
    act(() => {
      result.current.nextStep();
    });

    expect(result.current.currentStepIndex).toBe(2);
    expect(result.current.isLastStep).toBe(true);

    // Previous step back to step 2
    act(() => {
      result.current.prevStep();
    });

    expect(result.current.currentStepIndex).toBe(1);
    expect(result.current.isLastStep).toBe(false);

    // Previous step back to step 1
    act(() => {
      result.current.prevStep();
    });

    expect(result.current.currentStepIndex).toBe(0);

    // Prev step on first step should not go negative
    act(() => {
      result.current.prevStep();
    });

    expect(result.current.currentStepIndex).toBe(0);
  });

  it('completes tour on nextStep from the last step and writes to localStorage', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useWalkthrough({ ...defaultConfig, onComplete })
    );

    act(() => {
      result.current.startTour(2); // Start on last step
    });

    expect(result.current.isLastStep).toBe(true);

    act(() => {
      result.current.nextStep();
    });

    expect(result.current.isOpen).toBe(false);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('chil_tour_test-tour_user-123')).toBe('true');
  });

  it('skips tour and persists to localStorage', () => {
    const { result } = renderHook(() =>
      useWalkthrough(defaultConfig)
    );

    act(() => {
      result.current.startTour(0);
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.skipTour();
    });

    expect(result.current.isOpen).toBe(false);
    expect(localStorage.getItem('chil_tour_test-tour_user-123')).toBe('true');
  });

  it('resets tour by clearing localStorage and state', () => {
    localStorage.setItem('chil_tour_test-tour_user-123', 'true');

    const { result } = renderHook(() =>
      useWalkthrough(defaultConfig)
    );

    act(() => {
      result.current.startTour(1);
    });

    act(() => {
      result.current.resetTour();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.currentStepIndex).toBe(0);
    expect(localStorage.getItem('chil_tour_test-tour_user-123')).toBeNull();
  });

  it('responds to keyboard events (ArrowRight, ArrowLeft, Enter, Escape)', () => {
    const { result } = renderHook(() =>
      useWalkthrough(defaultConfig)
    );

    act(() => {
      result.current.startTour(0);
    });

    expect(result.current.currentStepIndex).toBe(0);

    // ArrowRight -> step 1
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    });
    expect(result.current.currentStepIndex).toBe(1);

    // ArrowLeft -> step 0
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    });
    expect(result.current.currentStepIndex).toBe(0);

    // Enter -> step 1
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    });
    expect(result.current.currentStepIndex).toBe(1);

    // Escape -> skips tour
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(result.current.isOpen).toBe(false);
    expect(localStorage.getItem('chil_tour_test-tour_user-123')).toBe('true');
  });

  it('queries target selector, scrolls into view and updates targetRect', () => {
    const div = document.createElement('div');
    div.setAttribute('data-testid', 'target-1');
    const mockRect = {
      top: 100,
      left: 50,
      width: 200,
      height: 80,
      bottom: 180,
      right: 250,
      x: 50,
      y: 100,
      toJSON: () => {}
    };
    div.getBoundingClientRect = vi.fn(() => mockRect as DOMRect);
    div.scrollIntoView = vi.fn();
    document.body.appendChild(div);

    const { result } = renderHook(() =>
      useWalkthrough(defaultConfig)
    );

    act(() => {
      result.current.startTour(0);
    });
    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(div.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    expect(result.current.targetRect).toEqual(mockRect);

    // Test resize event triggers recalculation
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    expect(div.getBoundingClientRect).toHaveBeenCalled();

    document.body.removeChild(div);
  });
});
