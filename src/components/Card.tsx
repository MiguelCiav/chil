import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white border border-primary/20 rounded-2xl flex flex-col overflow-hidden ${className}`}>
      {children}
    </div>
  );
};

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '' }) => (
  <div className={`px-6 py-4 border-b border-primary/10 bg-white ${className}`}>
    <div className="text-lg font-semibold text-neutral">{children}</div>
  </div>
);

interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

export const CardBody: React.FC<CardBodyProps> = ({ children, className = '' }) => (
  <div className={`p-6 bg-white flex-1 ${className}`}>
    {children}
  </div>
);

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className = '' }) => (
  // Using bg-primary/10 as you updated in the modal
  <div className={`px-6 py-4 bg-primary/10 border-t border-primary/10 flex items-center justify-between ${className}`}>
    {children}
  </div>
);
