import React from 'react';
import { HelpCircle } from 'lucide-react';

export interface WalkthroughHelpButtonProps {
  onClick: () => void;
  title?: string;
  className?: string;
}

export const WalkthroughHelpButton: React.FC<WalkthroughHelpButtonProps> = ({
  onClick,
  title = 'Ver guía interactiva',
  className = ''
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`p-1.5 text-neutral/50 hover:text-primary hover:bg-primary/5 rounded-full border border-gray-200 transition-all shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary/40 ${className}`}
    >
      <HelpCircle className="w-4 h-4" />
    </button>
  );
};
