import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, className = '' }) => {
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [mounted, setMounted] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Adjust state during render when isOpen prop changes (React recommended pattern)
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setMounted(true);
      setIsClosing(false);
    } else if (mounted) {
      setIsClosing(true);
    }
  }

  // Handle exit animation completion
  useEffect(() => {
    if (isClosing) {
      const timer = setTimeout(() => {
        setMounted(false);
        setIsClosing(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isClosing]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  // Trap focus inside dialog, handle Escape globally, and restore trigger focus on close
  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (dialog) {
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        dialog.focus();
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isClosing) {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialog) return;

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) {
        e.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [isOpen, isClosing, onClose]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Overlay */}
      <div
        data-testid="modal-backdrop"
        className={`absolute inset-0 bg-neutral/50 backdrop-blur-xs transition-opacity ${
          isClosing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop'
        }`}
        onClick={() => {
          if (!isClosing) onClose();
        }}
        aria-hidden="true"
      />

      {/* Modal Content - No shadow, subtle primary border, rounded with smooth pop in/out animation */}
      <dialog
        ref={dialogRef}
        open
        tabIndex={-1}
        aria-modal="true"
        className={`relative bg-white border border-primary/20 rounded-2xl flex flex-col w-full max-h-[90vh] overflow-hidden m-0 p-0 text-neutral focus:outline-none ${
          isClosing ? 'animate-modal-pop-out' : 'animate-modal-pop'
        } ${className}`}
      >
        {children}
      </dialog>
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
        className="p-1.5 text-neutral/70 hover:text-primary transition-colors rounded-lg hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Cerrar modal"
      >
        <X size={20} aria-hidden="true" />
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
