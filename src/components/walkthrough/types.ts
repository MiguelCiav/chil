export type WalkthroughPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto';

export interface WalkthroughStep {
  id: string;
  targetSelector: string; // e.g. '[data-walkthrough="batch-list-actions"]'
  title: string;
  content: string;
  placement?: WalkthroughPlacement;
  badge?: string;
}

export interface TourConfig {
  tourId: string; // Unique identifier (e.g. 'batch-list-tour')
  steps: WalkthroughStep[];
  onComplete?: () => void;
  userId?: string | null;
  autoStartDelay?: number; // Delay in ms before first-time auto-start (defaults to 400ms)
}
