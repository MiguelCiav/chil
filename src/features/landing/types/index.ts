import { ReactNode } from 'react';

export interface FeatureCardItem {
  id: string;
  icon: ReactNode;
  title: string;
  badge?: string;
  description: string;
  highlights: string[];
}

export interface WorkflowStepItem {
  stepNumber: number;
  title: string;
  description: string;
  icon: ReactNode;
  tagline: string;
}

export interface ScoutValueItem {
  title: string;
  description: string;
  badge: string;
  icon: ReactNode;
}
