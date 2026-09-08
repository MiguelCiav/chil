import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Folder,
  Zap,
  PlusCircle,
  Award,
  Table,
  BarChart3,
  Settings,
  LogIn,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import logo from '../assets/CHIL_LOGO.png';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './Modal';
import { Button } from './Button';
import { Field } from './Field';
import { hasScraperCredentials, saveScraperCredentials } from '../features/batches/api';
import { useAuth, UserProfileMenu } from '../features/auth';

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

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hasCredentials, setHasCredentials] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch settings when modal is opened
  useEffect(() => {
    if (isSettingsOpen) {
      hasScraperCredentials()
        .then(hasCreds => {
          setHasCredentials(hasCreds);
          setEmail('');
          setPassword('');
        })
        .catch(err => {
          console.error('Failed to check settings:', err);
        });
    }
  }, [isSettingsOpen]);

  const handleSave = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await saveScraperCredentials({ email, password });
      setHasCredentials(true);
      setSuccessMsg('Credenciales guardadas exitosamente.');
      setTimeout(() => {
        setIsSettingsOpen(false);
      }, 1500);
    } catch (err) {
      console.error(err);
      setErrorMsg('Error al guardar las credenciales.');
    } finally {
      setLoading(false);
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
      to: '/lotes/rapido',
      label: 'Emisión Rápida',
      icon: Zap,
      dataWalkthrough: 'nav-rapido',
      isSpecial: true
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
          <Link
            to={user ? '/lotes' : '/'}
            onClick={() => isMobile && onMobileClose()}
            className={`flex items-center gap-3 overflow-hidden transition-opacity hover:opacity-90 ${collapsed ? 'justify-center' : ''}`}
            title="Chil"
          >
            <img src={logo} alt="Chil Logo" className="h-8 w-8 object-contain shrink-0" />
            {!collapsed && (
              <span className="text-primary font-bold text-xl tracking-tight">
                Chil
              </span>
            )}
          </Link>

          {isMobile && (
            <button
              type="button"
              onClick={onMobileClose}
              className="p-1.5 rounded-lg text-neutral/60 hover:text-neutral hover:bg-gray-100 transition-colors"
              aria-label="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          )}
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

                    if (item.isSpecial) {
                      if (isActive) {
                        return `${baseClasses} bg-amber-300 text-neutral-950 font-bold shadow-xs border border-amber-400`;
                      }
                      return `${baseClasses} bg-amber-100 hover:bg-amber-200 text-neutral-900 border border-amber-300`;
                    }

                    if (isActive) {
                      return `${baseClasses} bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 shadow-2xs`;
                    }
                    return `${baseClasses} text-neutral/70 hover:text-neutral hover:bg-gray-100 border border-transparent`;
                  }}
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`w-5 h-5 shrink-0 transition-colors ${
                          item.isSpecial
                            ? isActive
                              ? 'text-neutral-950'
                              : 'text-amber-800'
                            : isActive
                            ? 'text-emerald-600'
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

        {/* Footer Area: Scraper Settings, User profile, Collapse toggle */}
        <div className="border-t border-gray-200 p-3 space-y-2">
          {user && (
            <>
              <button
                type="button"
                onClick={() => {
                  setSuccessMsg('');
                  setErrorMsg('');
                  setIsSettingsOpen(true);
                }}
                className={`w-full flex items-center gap-3 p-2 rounded-xl text-neutral/70 hover:text-neutral hover:bg-gray-100 transition-colors text-sm font-medium ${
                  collapsed ? 'justify-center' : ''
                }`}
                aria-label="Ajustes de Credenciales Scraper"
                title="Ajustes de Credenciales Scraper"
              >
                <Settings className="w-5 h-5 shrink-0" />
                {!collapsed && <span>Ajustes Scraper</span>}
              </button>

              <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between px-1'}`}>
                <UserProfileMenu />
              </div>
            </>
          )}

          {/* Desktop Collapse / Expand Button */}
          {!isMobile && (
            <button
              type="button"
              onClick={toggleCollapse}
              className={`w-full flex items-center gap-2 p-2 rounded-xl text-xs font-semibold text-neutral/60 hover:text-neutral hover:bg-gray-100 transition-colors ${
                collapsed ? 'justify-center' : 'justify-start'
              }`}
              aria-label={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
              title={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4 shrink-0" />
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4 shrink-0" />
                  <span>Colapsar</span>
                </>
              )}
            </button>
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
          <div className="fixed inset-y-0 left-0 w-72 max-w-[80vw] bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out">
            {renderNavContent(true)}
          </div>
        </div>
      )}

      {/* Scraper Credentials Modal */}
      <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} className="max-w-md">
        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden min-h-0">
          <ModalHeader onClose={() => setIsSettingsOpen(false)}>
            Configuración del Scraper ASV
          </ModalHeader>
          <ModalBody className="space-y-4">
            <p className="text-sm text-neutral/70">
              Ingrese sus credenciales del Sistema de Registro para permitir la consulta y verificación automatizada de miembros.
            </p>
            {hasCredentials && (
              <p className="text-xs text-green-600 font-semibold bg-green-50 p-2.5 rounded-lg border border-green-200">
                Credenciales configuradas. Rellene los campos si desea actualizarlas.
              </p>
            )}
            <Field
              label="Correo Electrónico"
              type="email"
              placeholder="ejemplo@scouts.org.ve"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required={!hasCredentials}
            />
            <Field
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!hasCredentials}
            />
            {successMsg && (
              <p className="text-sm text-green-600 font-semibold bg-green-50 p-2.5 rounded-lg border border-green-200">
                {successMsg}
              </p>
            )}
            {errorMsg && (
              <p className="text-sm text-red-600 font-semibold bg-red-50 p-2.5 rounded-lg border border-red-200">
                {errorMsg}
              </p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsSettingsOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Guardar Ajustes'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </>
  );
};
