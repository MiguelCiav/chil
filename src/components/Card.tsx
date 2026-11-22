import React, { ReactNode, HTMLAttributes } from 'react';

export type CardOverflow = 'hidden' | 'visible';
export type CardBodyPadding = 'md' | 'sm' | 'none';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  overflow?: CardOverflow;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  overflow = 'hidden',
  className = '',
  ...rest
}) => {
  const overflowClass = overflow === 'visible' ? 'overflow-visible' : 'overflow-hidden';

  return (
    <div
      className={`bg-white border border-primary/20 rounded-2xl flex flex-col ${overflowClass} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '', ...rest }) => (
  <div className={`px-6 py-4 border-b border-primary/10 bg-white flex flex-row items-center justify-between gap-4 text-lg font-semibold text-neutral ${className}`} {...rest}>
    {children}
  </div>
);

export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: CardBodyPadding;
  className?: string;
}

const CARD_BODY_PADDING: Record<CardBodyPadding, string> = {
  md: 'p-6',
  sm: 'p-4',
  none: 'p-0'
};

export const CardBody: React.FC<CardBodyProps> = ({
  children,
  padding = 'md',
  className = '',
  ...rest
}) => (
  <div className={`${CARD_BODY_PADDING[padding]} bg-white flex-1 ${className}`} {...rest}>
    {children}
  </div>
);

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className = '', ...rest }) => (
  // Using bg-primary/10 as you updated in the modal
  <div className={`px-6 py-4 bg-primary/10 border-t border-primary/10 flex items-center justify-between ${className}`} {...rest}>
    {children}
  </div>
);
