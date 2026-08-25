import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Bell, Settings, LogIn, UserPlus } from 'lucide-react';
import logo from '../assets/CHIL_LOGO.png';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './Modal';
import { Button } from './Button';
import { Field } from './Field';
import { hasScraperCredentials, saveScraperCredentials } from '../features/batches/api';
import { useAuth, UserProfileMenu } from '../features/auth';

export const Navbar: React.FC = () => {
  const { user } = useAuth();
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
          console.error("Failed to check settings:", err);
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

  return (
    <nav className="h-16 px-6 border-b border-gray-200 bg-white flex items-center justify-between font-sans">
      <div className="flex items-center h-full">
        {/* Logo */}
        <Link to={user ? "/lotes" : "/login"} className="flex items-center mr-8 hover:opacity-95 transition-opacity">
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
                `flex items-center my-auto px-3 py-1.5 rounded-lg transition-all shadow-xs ${isActive
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
          <button type="button" className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Notificaciones">
            <Bell className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setSuccessMsg('');
              setErrorMsg('');
              setIsSettingsOpen(true);
            }}
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
                ✓ Credenciales configuradas. Rellene los campos si desea actualizarlas.
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
    </nav>
  );
};


