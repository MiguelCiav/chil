import { useState, useEffect, useCallback, useMemo } from 'react';
import { TourConfig, WalkthroughStep } from './types';

export interface UseWalkthroughReturn {
  isOpen: boolean;
  currentStepIndex: number;
  currentStep: WalkthroughStep | null;
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  targetRect: DOMRect | null;
  startTour: (stepIndex?: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  resetTour: () => void;
}

export function useWalkthrough(config: TourConfig): UseWalkthroughReturn {
  const { tourId, steps, onComplete, userId, autoStartDelay = 400 } = config;
  const storageKey = `chil_tour_${tourId}_${userId || 'anon'}`;

  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const totalSteps = steps.length;
  const currentStep = useMemo<WalkthroughStep | null>(() => {
    if (!isOpen || currentStepIndex < 0 || currentStepIndex >= totalSteps) {
      return null;
    }
    return steps[currentStepIndex];
  }, [isOpen, currentStepIndex, steps, totalSteps]);

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  // Complete tour handler
  const completeTour = useCallback(() => {
    try {
      localStorage.setItem(storageKey, 'true');
    } catch (err) {
      console.warn('Unable to write tour completion to localStorage:', err);
    }
    setIsOpen(false);
    onComplete?.();
  }, [storageKey, onComplete]);

  // Skip tour handler
  const skipTour = useCallback(() => {
    try {
      localStorage.setItem(storageKey, 'true');
    } catch (err) {
      console.warn('Unable to write tour skip to localStorage:', err);
    }
    setIsOpen(false);
  }, [storageKey]);

  // Start tour handler
  const startTour = useCallback((stepIndex = 0) => {
    setCurrentStepIndex(stepIndex);
    setIsOpen(true);
  }, []);

  // Advance to next step or complete
  const nextStep = useCallback(() => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      completeTour();
    }
  }, [currentStepIndex, totalSteps, completeTour]);

  // Return to previous step
  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  // Reset tour state & clear storage
  const resetTour = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch (err) {
      console.warn('Unable to clear tour localStorage:', err);
    }
    setIsOpen(false);
    setCurrentStepIndex(0);
    setTargetRect(null);
  }, [storageKey]);

  // Auto-start tour if not seen before
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const hasSeen = localStorage.getItem(storageKey);
      if (!hasSeen && totalSteps > 0) {
        const timer = setTimeout(() => {
          setIsOpen(true);
          setCurrentStepIndex(0);
        }, autoStartDelay);
        return () => clearTimeout(timer);
      }
    } catch (err) {
      console.warn('Unable to read tour status from localStorage:', err);
    }
  }, [storageKey, totalSteps, autoStartDelay]);

  // Helper to calculate target element bounding rect
  const updateTargetRect = useCallback(() => {
    if (!isOpen || !currentStep) {
      setTargetRect(null);
      return;
    }
    const element = document.querySelector(currentStep.targetSelector);
    if (element) {
      setTargetRect(element.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStep]);

  // Scroll element into view and update rect on step change
  useEffect(() => {
    if (!isOpen || !currentStep) {
      return;
    }

    const element = document.querySelector(currentStep.targetSelector);
    if (element && typeof element.scrollIntoView === 'function') {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const timer = setTimeout(() => {
      const el = document.querySelector(currentStep.targetSelector);
      setTargetRect(el ? el.getBoundingClientRect() : null);
    }, 0);

    return () => clearTimeout(timer);
  }, [isOpen, currentStep]);

  // Listen to window resize and scroll events to dynamically recalculate targetRect
  useEffect(() => {
    if (!isOpen) return;

    const handleRecalculate = () => {
      updateTargetRect();
    };

    window.addEventListener('resize', handleRecalculate);
    window.addEventListener('scroll', handleRecalculate, true);

    return () => {
      window.removeEventListener('resize', handleRecalculate);
      window.removeEventListener('scroll', handleRecalculate, true);
    };
  }, [isOpen, updateTargetRect]);

  // Keyboard navigation: Escape -> skip, ArrowRight / Enter -> next, ArrowLeft -> prev
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        skipTour();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, skipTour, nextStep, prevStep]);

  return {
    isOpen,
    currentStepIndex,
    currentStep,
    totalSteps,
    isFirstStep,
    isLastStep,
    targetRect,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
    resetTour
  };
}
