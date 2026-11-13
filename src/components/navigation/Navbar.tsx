import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Settings, LogIn, UserPlus } from 'lucide-react';
import logo from '../../assets/CHIL_LOGO.png';
import { Button } from '../Button';
import { useAuth, UserProfileMenu } from '../../features/auth';
import { useScraperSettings } from '../../context/ScraperSettingsContext';

export const Navbar: React.FC = () => {
  const { user } = useAuth();
  const { openModal } = useScraperSettings();

  return (
    <nav className="h-16 px-6 border-b border-gray-200 bg-white flex items-center justify-between font-sans">
      <div className="flex items-center h-full">
        {/* Logo */}
        <Link to={user ? "/lotes" : "/"} className="flex items-center mr-8 hover:opacity-95 transition-opacity">
          <img src={logo} alt="Chil Logo" className="h-8 w-auto mr-2" />
          <div className="text-primary font-bold text-xl">
            Chil
          </div>
        </Link>

        {/* Navigation Links - Authenticated only */}
        {user && (
          <div className="flex h-full space-x-6">
            <NavLink
              to="/lotes/rapido"
              end
              className={({ isActive }) =>
                `flex items-center my-auto px-3 py-1.5 rounded-lg transition-all ${isActive
                  ? 'bg-amber-300 text-neutral-950 border border-amber-400 font-bold'
                  : 'bg-amber-100 hover:bg-amber-200 text-neutral-900 border border-amber-300 font-semibold'
                }`
              }
            >
              Emisión Rápida
            </NavLink>
            <NavLink
              to="/lotes/nuevo"
              end
              className={({ isActive }) =>
                `flex items-center h-full px-1 border-b-2 transition-all font-semibold ${isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-neutral hover:text-primary'
                }`
              }
            >
              Nuevo lote
            </NavLink>
            <NavLink
              to="/lotes"
              end
              className={({ isActive }) =>
                `flex items-center h-full px-1 border-b-2 transition-all font-semibold ${isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-neutral hover:text-primary'
                }`
              }
            >
              Listado de lotes
            </NavLink>
            <NavLink
              to="/reconocimientos"
              end
              className={({ isActive }) =>
                `flex items-center h-full px-1 border-b-2 transition-all font-semibold ${isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-neutral hover:text-primary'
                }`
              }
            >
              Reconocimientos
            </NavLink>
            <NavLink
              to="/resumen"
              end
              className={({ isActive }) =>
                `flex items-center h-full px-1 border-b-2 transition-all font-semibold ${isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-neutral hover:text-primary'
                }`
              }
            >
              Resumen
            </NavLink>
            <NavLink
              to="/estadisticas"
              end
              className={({ isActive }) =>
                `flex items-center h-full px-1 border-b-2 transition-all font-semibold ${isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-neutral hover:text-primary'
                }`
              }
            >
              Estadísticas
            </NavLink>
          </div>
        )}
      </div>

      {/* Right Side */}
      {user ? (
        <div className="flex items-center space-x-4 text-neutral">
          <button
            type="button"
            onClick={openModal}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Ajustes de Credenciales Scraper"
          >
            <Settings className="w-5 h-5" />
          </button>
          <UserProfileMenu />
        </div>
      ) : (
        <div className="flex items-center space-x-3">
          <Link to="/login">
            <Button
              variant="ghost"
              size="sm"
              icon={<LogIn className="w-4 h-4" />}
            >
              Iniciar Sesión
            </Button>
          </Link>
          <Link to="/registro">
            <Button
              variant="primary"
              size="sm"
              icon={<UserPlus className="w-4 h-4" />}
            >
              Registrarse
            </Button>
          </Link>
        </div>
      )}
    </nav>
  );
};


