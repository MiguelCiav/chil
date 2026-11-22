import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import logo from '../../../assets/CHIL_LOGO.png';
import { useScrollProgress } from '../hooks/useScrollProgress';
import { RevealOnScroll } from './RevealOnScroll';
import { TopoBackdrop } from './TopoBackdrop';

const SECTION_LINKS = [
  { href: '#lotes-masivos', label: 'Verificación' },
  { href: '#disenador-plantillas', label: 'Diseñador de reconocimientos' },
  { href: '#exportacion-flexible', label: 'Exportación por grupo' },
  { href: '#analitica-territorial', label: 'Analítica' }
];

export const LandingFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const ctaRef = useScrollProgress<HTMLDivElement>({ start: 1, end: 0.6 });

  return (
    <div className="relative overflow-hidden bg-[#2E1208] text-white">
      <TopoBackdrop animated />

      {/* Closing call to action */}
      <section
        aria-labelledby="landing-cta-title"
        className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-32 lg:pt-40 pb-20 sm:pb-28"
      >
        <div ref={ctaRef}>
          <h2
            id="landing-cta-title"
            className="font-display font-black tracking-tight text-[clamp(3rem,9vw,8rem)] leading-[0.92] max-w-5xl origin-left will-change-transform"
            style={{ transform: 'scale(calc(0.9 + var(--scroll-progress, 1) * 0.1))' }}
          >
            Tu próximo lote{' '}
            <span className="block text-[#E9A27F]">empieza hoy.</span>
          </h2>
        </div>

        <RevealOnScroll delayMs={120}>
          <p className="mt-8 text-lg sm:text-2xl text-white/75 max-w-2xl leading-snug">
            Crea tu cuenta gratis y prepara tu primer lote verificado.
          </p>
        </RevealOnScroll>

        <RevealOnScroll delayMs={220}>
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link
              to="/registro"
              className="group inline-flex items-center justify-center gap-3 min-h-[56px] px-8 rounded-2xl bg-white text-primary text-lg font-bold hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#2E1208] focus-visible:ring-white"
            >
              Crear cuenta gratuita
              <ArrowRight
                className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center min-h-[56px] px-8 rounded-2xl border-2 border-white/70 text-white text-lg font-semibold hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#2E1208] focus-visible:ring-white"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </RevealOnScroll>
      </section>

      {/* Compact footer */}
      <footer className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 pt-10 border-t border-white/20">
          <div className="space-y-3 max-w-sm">
            <div className="flex items-center gap-2.5">
              <img src={logo} alt="Chil Logo" width={36} height={35} className="h-9 w-auto object-contain" />
              <span className="font-display text-2xl font-bold text-white tracking-tight">Chil</span>
            </div>
            <p className="text-sm text-white/75 leading-relaxed">
              Sistema de Emisión y Control de Reconocimientos Scouts.
            </p>
          </div>

          <nav aria-label="Secciones de la página" className="grid grid-cols-2 gap-x-10 gap-y-1 text-sm font-semibold">
            {SECTION_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="inline-flex items-center min-h-[44px] text-white/80 hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
            <Link to="/login" className="inline-flex items-center min-h-[44px] text-white/80 hover:text-white transition-colors">
              Iniciar Sesión
            </Link>
            <Link to="/registro" className="inline-flex items-center min-h-[44px] text-white/80 hover:text-white transition-colors">
              Crear Cuenta
            </Link>
          </nav>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/75">
          <p>© {currentYear} Chil. Todos los derechos reservados.</p>
          <p>
            <span className="italic">"Siempre Listos para Servir"</span>
            <span aria-hidden="true"> · </span>
            <span>para el Movimiento Scout</span>
          </p>
        </div>
      </footer>
    </div>
  );
};
