import React from 'react';
import { Link } from 'react-router-dom';
import { LogIn, UserPlus } from 'lucide-react';
import logo from '../../../assets/CHIL_LOGO.png';

export const LandingFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-gray-200/80 bg-white/80 backdrop-blur-xs pt-12 pb-8 text-neutral rounded-2xl sm:rounded-3xl shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-gray-100">
          {/* Col 1: Branding & Mission */}
          <div className="md:col-span-6 space-y-4 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2.5">
              <img src={logo} alt="Chil Logo" className="h-9 w-auto" />
              <span className="text-2xl font-bold text-primary tracking-tight">Chil</span>
            </div>
            <p className="text-sm text-neutral/70 max-w-sm mx-auto md:mx-0 leading-relaxed">
              Sistema de Emisión y Control de Reconocimientos Scouts. Estandarizando el reconocimiento institucional con excelencia y modernidad.
            </p>
          </div>

          {/* Col 2: Acceso Directo */}
          <div className="md:col-span-3 space-y-3 text-center md:text-left">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral/80">
              Acceso a la Plataforma
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-neutral/70 hover:text-primary transition-colors font-medium"
                >
                  <LogIn className="w-4 h-4 text-primary shrink-0" />
                  <span>Iniciar Sesión</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/registro"
                  className="inline-flex items-center gap-2 text-neutral/70 hover:text-primary transition-colors font-medium"
                >
                  <UserPlus className="w-4 h-4 text-primary shrink-0" />
                  <span>Crear Cuenta / Registrarse</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Secciones & Módulos */}
          <div className="md:col-span-3 space-y-3 text-center md:text-left">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral/80">
              Módulos Principales
            </h4>
            <ul className="space-y-2.5 text-sm text-neutral/70">
              <li>
                <a href="#emision-rapida" className="hover:text-primary transition-colors">
                  Emisión Rápida de Reconocimientos
                </a>
              </li>
              <li>
                <a href="#lotes-masivos" className="hover:text-primary transition-colors">
                  Gestión de Lotes Masivos
                </a>
              </li>
              <li>
                <a href="#disenador-plantillas" className="hover:text-primary transition-colors">
                  Diseñador Visual de Diplomas
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright & formal Scout motto */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral/60 gap-4">
          <p>© {currentYear} Chil. Todos los derechos reservados.</p>
          <div className="flex items-center gap-2 font-medium text-neutral/70">
            <span className="italic">"Siempre Listos para Servir"</span>
            <span>·</span>
            <span>para el Movimiento Scout</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
