import React, { ReactNode, HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...rest }) => {
  return (
    <div className={`bg-white border border-primary/20 rounded-2xl flex flex-col overflow-hidden ${className}`} {...rest}>
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

interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export const CardBody: React.FC<CardBodyProps> = ({ children, className = '', ...rest }) => (
  <div className={`p-6 bg-white flex-1 ${className}`} {...rest}>
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
