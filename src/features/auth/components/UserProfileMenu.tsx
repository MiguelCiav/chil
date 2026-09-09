import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

function getInitials(name?: string | null, email?: string | null): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts.at(-1)?.[0] ?? ''}`.toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }
  if (email?.trim()) {
    return email.substring(0, 2).toUpperCase();
  }
  return 'US';
}

export interface UserProfileMenuProps {
  isCollapsed?: boolean;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({ isCollapsed = false }) => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!user) return null;

  const initials = getInitials(user.displayName, user.email);
  const displayName = user.displayName ?? 'Usuario Scout';
  const email = user.email ?? '';

  const handleLogout = async () => {
    setIsOpen(false);
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
          isCollapsed ? 'justify-center' : ''
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Menú de usuario"
        title={displayName}
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={displayName}
            className="w-8 h-8 rounded-full object-cover border border-primary/20 shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0">
            {initials}
          </div>
        )}
        {!isCollapsed && (
          <>
            <span className="text-xs font-semibold text-neutral max-w-[120px] truncate">
              {displayName}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral/50 transition-transform duration-200 shrink-0" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
          </>
        )}
      </button>

      {isOpen && (
        <div
          className={`origin-bottom-left absolute bottom-full ${isCollapsed ? 'left-0' : 'left-0 sm:left-auto sm:right-0'} mb-2 w-64 rounded-2xl shadow-lg bg-white border border-gray-200 py-2 z-50 focus:outline-none animate-in fade-in zoom-in-95 duration-100`}
          role="menu"
          aria-orientation="vertical"
        >
          {/* User info header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-sm flex items-center justify-center flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-neutral truncate">
                  {displayName}
                </p>
                <p className="text-[11px] text-neutral/60 truncate font-mono">
                  {email}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="py-1">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors font-semibold text-left"
              role="menuitem"
            >
              <LogOut className="w-4 h-4 text-red-500" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
