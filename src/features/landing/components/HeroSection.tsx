import React from 'react';
import { Link } from 'react-router-dom';
import { LogIn, ArrowRight, Award } from 'lucide-react';
import logo from '../../../assets/CHIL_LOGO.png';
import { Button } from '../../../components/Button';

export const HeroSection: React.FC = () => {
  return (
    <section className="relative overflow-hidden pt-8 pb-14 sm:pt-12 sm:pb-20 lg:pt-16 lg:pb-24">
      {/* Background ambient lighting effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-primary/10 via-amber-50/20 to-transparent blur-3xl -z-10 pointer-events-none rounded-full" />
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 w-72 h-72 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute top-1/4 right-1/3 translate-x-1/2 w-80 h-80 bg-amber-100/25 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        {/* Top Scout Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold shadow-xs mb-6 sm:mb-8 backdrop-blur-xs hover:bg-primary/15 transition-colors">
          <Award className="w-4 h-4 text-primary shrink-0" />
          <span>Sistema Oficial del Movimiento Scout</span>
        </div>

        {/* Logo and Brand */}
        <div className="flex flex-col items-center justify-center gap-3 mb-6">
          <img
            src={logo}
            alt="Chil Logo"
            className="h-28 sm:h-32 lg:h-36 w-auto drop-shadow-md hover:scale-105 transition-transform duration-300 select-none"
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
        <p className="text-base sm:text-lg text-neutral/80 max-w-2xl mx-auto leading-relaxed mb-8 sm:mb-10">
          La plataforma moderna, ágil y usable para gestionar lotes de reconocimientos, hacer diseños visuales interactivos y generar analítica en el Movimiento.
        </p>

        {/* CTA Buttons & Fast Action */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 max-w-md mx-auto">
          <Link to="/registro" className="w-full sm:w-auto flex-1">
            <Button
              size="lg"
              variant="primary"
              fullWidth
              icon={<ArrowRight className="w-4 h-4" />}
              iconPosition="right"
              className="shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/30 hover:-translate-y-0.5 transition-all text-sm sm:text-base font-bold"
            >
              Comenzar Ahora
            </Button>
          </Link>

          <Link to="/login" className="w-full sm:w-auto flex-1">
            <Button
              size="lg"
              variant="outline"
              fullWidth
              className="border-gray-300 hover:bg-gray-50/80 hover:border-gray-400 hover:-translate-y-0.5 transition-all text-sm sm:text-base font-semibold shadow-2xs"
              icon={<LogIn className="w-4 h-4 text-neutral/70" />}
            >
              Iniciar Sesión
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
