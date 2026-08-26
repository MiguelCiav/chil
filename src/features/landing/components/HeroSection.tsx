import React from 'react';
import { Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import logo from '../../../assets/CHIL_LOGO.png';
import { Button } from '../../../components/Button';

export const HeroSection: React.FC = () => {
  return (
    <section className="relative overflow-hidden pt-6 pb-12 sm:pt-10 sm:pb-16 lg:pb-20">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-tr from-primary/15 via-amber-100/30 to-tertiary/10 blur-3xl -z-10 pointer-events-none rounded-full" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Logo and Brand */}
        <div className="flex flex-col items-center justify-center gap-4 mb-6">
          <img
            src={logo}
            alt="Chil Logo"
            className="h-28 sm:h-32 lg:h-36 w-auto drop-shadow-md hover:scale-105 transition-transform duration-300"
          />
          <span className="text-4xl sm:text-5xl font-black text-primary tracking-tight">
            Chil
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-neutral tracking-tight leading-tight mb-4">
          Un Sistema Scout de Emisión y Control de Reconocimientos
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-neutral/80 max-w-2xl mx-auto leading-relaxed mb-8">
          La plataforma moderna, ágil y usable para gestionar lotes de reconocimientos, hacer diseños visuales interactivos y generar analítica en el Movimiento.
        </p>

        {/* CTA Buttons & Fast Action */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
          <Link to="/registro" className="w-full sm:w-auto flex-1">
            <Button
              size="lg"
              variant="primary"
              fullWidth
              className="shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all text-sm sm:text-base font-bold"
            >
              Comenzar Ahora
            </Button>
          </Link>

          <Link to="/login" className="w-full sm:w-auto flex-1">
            <Button
              size="lg"
              variant="outline"
              fullWidth
              className="border-gray-300 hover:bg-gray-50 text-sm sm:text-base font-semibold"
              icon={<LogIn className="w-5 h-5 text-neutral/70" />}
            >
              Iniciar Sesión
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
