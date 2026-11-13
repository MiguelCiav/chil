import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Folder,
  PlusCircle,
  Award,
  Table,
  BarChart3,
  Settings,
  LogIn,
  UserPlus,
  ChevronLeft,
  X
} from 'lucide-react';
import logo from '../../assets/CHIL_LOGO.png';
import { Button } from '../Button';
import { useAuth, UserProfileMenu } from '../../features/auth';
import { useScraperSettings } from '../../context/ScraperSettingsContext';

const SIDEBAR_COLLAPSED_KEY = 'chil_sidebar_collapsed';

export interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen = false,
  onMobileClose = () => {},
  isCollapsed: controlledCollapsed,
  onToggleCollapse
}) => {
  const { user } = useAuth();
  const { openModal, sessionStatus } = useScraperSettings();
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      return stored === 'true';
    } catch {
      return false;
    }
  });

  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const toggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed(prev => {
        const next = !prev;
        try {
          localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
        } catch {
          // ignore storage errors
        }
        return next;
      });
    }
  };

  const navItems = [
    {
      to: '/lotes',
      label: 'Lotes',
      icon: Folder,
      dataWalkthrough: 'nav-lotes'
    },
    {
      to: '/lotes/nuevo',
      label: 'Nuevo Lote',
      icon: PlusCircle,
      dataWalkthrough: 'nav-nuevo'
    },
    {
      to: '/reconocimientos',
      label: 'Reconocimientos',
      icon: Award,
      dataWalkthrough: 'nav-reconocimientos'
    },
    {
      to: '/resumen',
      label: 'Resumen',
      icon: Table,
      dataWalkthrough: 'nav-resumen'
    },
    {
      to: '/estadisticas',
      label: 'Estadísticas',
      icon: BarChart3,
      dataWalkthrough: 'nav-estadisticas'
    }
  ];

  const renderNavContent = (isMobile = false) => {
    const collapsed = isMobile ? false : isCollapsed;

    return (
      <div className="flex flex-col h-full bg-white text-neutral select-none">
        {/* Header / Logo */}
        <div className={`flex items-center h-16 border-b border-gray-200 ${collapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
          {collapsed ? (
            <button
              type="button"
              onClick={toggleCollapse}
              className="p-1.5 rounded-xl hover:bg-gray-100 transition-all focus:outline-none focus:ring-2 focus:ring-primary flex items-center justify-center cursor-pointer"
              aria-label="Expandir barra lateral"
              title="Expandir barra lateral"
            >
              <img src={logo} alt="Chil Logo" className="h-8 w-8 object-contain shrink-0" />
            </button>
          ) : (
            <Link
              to={user ? '/lotes' : '/'}
              onClick={() => isMobile && onMobileClose()}
              className="flex items-center gap-3 overflow-hidden transition-opacity hover:opacity-90"
              title="Chil"
            >
              <img src={logo} alt="Chil Logo" className="h-8 w-8 object-contain shrink-0" />
              <span className="text-primary font-bold text-xl tracking-tight">
                Chil
              </span>
            </Link>
          )}

          {isMobile ? (
            <button
              type="button"
              onClick={onMobileClose}
              className="p-1.5 rounded-lg text-neutral/60 hover:text-neutral hover:bg-gray-100 transition-colors"
              aria-label="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          ) : !collapsed ? (
            <button
              type="button"
              onClick={toggleCollapse}
              className="p-1.5 rounded-lg text-neutral/60 hover:text-neutral hover:bg-gray-100 transition-colors"
              aria-label="Colapsar barra lateral"
              title="Colapsar barra lateral"
            >
              <ChevronLeft className="w-4 h-4 shrink-0" />
            </button>
          ) : null}
        </div>

        {/* Navigation Items */}
        <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
          {user ? (
            navItems.map(item => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end
                  data-walkthrough={item.dataWalkthrough}
                  onClick={() => isMobile && onMobileClose()}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) => {
                    const baseClasses = `group flex items-center gap-3 rounded-xl transition-all font-semibold text-sm ${
                      collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
                    }`;

                    if (isActive) {
                      return `${baseClasses} bg-primary/10 text-primary font-bold border border-primary/20`;
                    }
                    return `${baseClasses} text-neutral/70 hover:text-neutral hover:bg-gray-100 border border-transparent`;
                  }}
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`w-5 h-5 shrink-0 transition-colors ${
                          isActive
                            ? 'text-primary'
                            : 'text-neutral/50 group-hover:text-neutral/80'
                        }`}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </>
                  )}
                </NavLink>
              );
            })
          ) : (
            <div className="flex flex-col gap-2 pt-2">
              <Link
                to="/login"
                onClick={() => isMobile && onMobileClose()}
                className="w-full"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  fullWidth={!collapsed}
                  icon={<LogIn className="w-4 h-4" />}
                  className={collapsed ? 'justify-center px-2' : ''}
                >
                  {!collapsed && 'Iniciar Sesión'}
                </Button>
              </Link>
              <Link
                to="/registro"
                onClick={() => isMobile && onMobileClose()}
                className="w-full"
              >
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth={!collapsed}
                  icon={<UserPlus className="w-4 h-4" />}
                  className={collapsed ? 'justify-center px-2' : ''}
                >
                  {!collapsed && 'Registrarse'}
                </Button>
              </Link>
            </div>
          )}
        </nav>

        {/* Footer Area: Scraper Settings, User profile */}
        <div className="border-t border-gray-200 p-3 space-y-2">
          {user && (
            <>
              <button
                type="button"
                onClick={openModal}
                className={`w-full flex items-center gap-3 p-2 rounded-xl text-neutral/70 hover:text-neutral hover:bg-gray-100 transition-colors text-sm font-medium ${
                  collapsed ? 'justify-center' : ''
                }`}
                aria-label="Ajustes de Credenciales Scraper"
                title="Ajustes de Credenciales Scraper"
              >
                <span className="relative shrink-0">
                  <Settings className="w-5 h-5" />
                  {sessionStatus?.status === 'active' && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500"
                      aria-hidden="true"
                    />
                  )}
                </span>
                {!collapsed && <span>Ajustes Scraper</span>}
              </button>

              <div className={`flex items-center ${collapsed ? 'justify-center' : 'w-full'}`}>
                <UserProfileMenu isCollapsed={collapsed} />
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile, fixed/sticky on md+) */}
      <aside
        aria-label="Barra lateral"
        className={`hidden md:flex flex-col shrink-0 border-r border-gray-200 bg-white transition-[width] duration-200 ease-in-out z-30 sticky top-0 h-screen ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {renderNavContent(false)}
      </aside>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menú lateral móvil"
        >
          {/* Dark Backdrop */}
          <div
            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={onMobileClose}
            aria-hidden="true"
            data-testid="sidebar-backdrop"
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[80vw] bg-white border-r border-gray-200 z-50 flex flex-col transform transition-transform duration-300 ease-in-out">
            {renderNavContent(true)}
          </div>
        </div>
      )}
    </>
  );
};
