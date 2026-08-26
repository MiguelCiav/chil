import React, { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, className = '' }) => {
  // Prevent scrolling on body when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Overlay */}
      <div
        data-testid="modal-backdrop"
        className="absolute inset-0 bg-neutral/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      />

      {/* Modal Content - No shadow, subtle primary border, rounded */}
      <div
        className={`relative bg-white border border-primary/20 rounded-2xl flex flex-col w-full max-h-[90vh] overflow-hidden ${className}`}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
};

interface ModalHeaderProps {
  children: ReactNode;
  onClose?: () => void;
  className?: string;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({ children, onClose, className = '' }) => (
  <div className={`px-6 py-4 border-b border-primary/10 flex justify-between items-center bg-white flex-shrink-0 ${className}`}>
    <div className="text-lg font-semibold text-neutral">{children}</div>
    {onClose && (
      <button
        type="button"
        onClick={onClose}
        className="p-1.5 text-neutral/60 hover:text-primary transition-colors rounded-lg hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label="Cerrar modal"
      >
        <X size={20} />
      </button>
    )}
  </div>
);

interface ModalBodyProps {
  children: ReactNode;
  className?: string;
}

export const ModalBody: React.FC<ModalBodyProps> = ({ children, className = '' }) => (
  <div className={`px-6 py-5 overflow-y-auto flex-1 bg-white ${className}`}>
    {children}
  </div>
);

interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({ children, className = '' }) => (
  <div className={`px-6 py-4 bg-white border-t border-gray-100 flex items-center justify-between flex-shrink-0 sticky bottom-0 z-10 ${className}`}>
    {children}
  </div>
);
