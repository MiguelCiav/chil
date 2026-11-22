import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, LogIn } from 'lucide-react';
import logo from '../../../assets/CHIL_LOGO.png';
import worldScoutLogo from '../../../assets/WSCT_LOGO_EN_RGB_NEG.svg';
import recognitionFront from '../../../assets/recognitions/reconocimiento-1.webp';
import recognitionLeft from '../../../assets/recognitions/reconocimiento-2.webp';
import recognitionRight from '../../../assets/recognitions/reconocimiento-3.webp';
import { useScrollProgress } from '../hooks/useScrollProgress';
import { TopoBackdrop } from './TopoBackdrop';

interface SideRecognitionCard {
  id: string;
  src: string;
  position: string;
  rotate: number;
  drift: string;
  delayMs: number;
  zClass: string;
}

/* Official Venezuelan Scout recognition templates supplied by the product owner (1113x1440, Carta). */
const SIDE_CARDS: SideRecognitionCard[] = [
  {
    id: 'campeones-naturaleza',
    src: recognitionLeft,
    position: 'left-[3%] top-[8%]',
    rotate: -8,
    drift: 'translate3d(calc(var(--scroll-progress, 0) * -32px), calc(var(--scroll-progress, 0) * -10px), 0)',
    delayMs: 240,
    zClass: 'z-0'
  },
  {
    id: 'robots-letales',
    src: recognitionRight,
    position: 'right-[3%] top-[8%]',
    rotate: 8,
    drift: 'translate3d(calc(var(--scroll-progress, 0) * 32px), calc(var(--scroll-progress, 0) * -10px), 0)',
    delayMs: 340,
    zClass: 'z-10'
  }
];

/**
 * Decorative editorial fan of three real Scout recognition templates produced in Chil.
 * Portrait Carta geometry (216 x 279 mm) with live template field marker and verified seal.
 */
const RecognitionStack: React.FC = () => (
  <div
    aria-hidden="true"
    className="relative w-full max-w-[22.5rem] sm:max-w-[29rem] lg:max-w-[33.5rem] mx-auto aspect-[11/9] select-none"
  >
    {SIDE_CARDS.map((card) => (
      <div
        key={card.id}
        className={`absolute ${card.zClass} w-[52%] aspect-[1113/1440] will-change-transform ${card.position}`}
        style={{ transform: card.drift }}
      >
        <div
          className="animate-card-deal h-full w-full"
          style={{ transform: `rotate(${card.rotate}deg)`, animationDelay: `${card.delayMs}ms` }}
        >
          <div className="h-full w-full rounded-lg overflow-hidden bg-white ring-1 ring-[#643425]/18 shadow-[0_18px_36px_-18px_rgba(46,18,8,0.48)]">
            <img
              src={card.src}
              alt=""
              width={1113}
              height={1440}
              decoding="async"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    ))}

    {/* Center front real recognition with designer field preview, verified seal and 216 mm ruler */}
    <div
      className="absolute z-20 left-[21%] top-[2%] w-[58%] aspect-[1113/1440] will-change-transform"
      style={{ transform: 'translate3d(0, calc(var(--scroll-progress, 0) * -10px), 0)' }}
    >
      <div
        className="animate-card-deal relative h-full w-full"
        style={{ transform: 'rotate(-1deg)', animationDelay: '440ms' }}
      >
        <div className="@container relative h-full w-full rounded-lg overflow-hidden bg-white ring-1 ring-[#643425]/22 shadow-[0_28px_54px_-20px_rgba(46,18,8,0.55)]">
          <img
            src={recognitionFront}
            alt=""
            width={1113}
            height={1440}
            fetchPriority="high"
            className="w-full h-full object-cover"
          />

          {/* Dynamic field box mapped over the recipient line of the real template */}
          <div className="absolute top-[45.8%] left-[12%] right-[12%] rounded border border-dashed border-sky-700/85 bg-sky-50/90 px-[2.5cqw] py-[0.8cqw] text-center">
            <p className="font-display font-bold text-neutral text-[clamp(0.75rem,4.6cqw,1rem)] leading-tight truncate">
              Nombre y Apellido
            </p>
          </div>

          {/* Soft privacy blur over the handwritten signatures on the front template */}
          <div className="absolute top-[73.5%] h-[12%] left-[9%] w-[29%] rounded-md backdrop-blur-[5px] bg-white/35" />
          <div className="absolute top-[73.5%] h-[12%] right-[9%] w-[28%] rounded-md backdrop-blur-[5px] bg-white/35" />
        </div>

        {/* Verified seal positioned in open top margin without obscuring emblems or text */}
        <span
          className="animate-card-deal absolute -top-3.5 right-[22%] inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs sm:text-sm font-bold text-emerald-800 shadow-[0_8px_18px_-10px_rgba(46,18,8,0.5)] whitespace-nowrap"
          style={{ transform: 'rotate(1deg)', animationDelay: '680ms' }}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Registro vigente
        </span>

        {/* Real US Letter portrait width ruler (216 x 279 mm) */}
        <div className="absolute -bottom-6 inset-x-0 flex items-center gap-2 text-primary">
          <span className="h-2.5 w-px bg-primary" />
          <span className="h-px flex-1 bg-primary/60" />
          <span className="font-mono text-xs font-bold">216 mm</span>
          <span className="h-px flex-1 bg-primary/60" />
          <span className="h-2.5 w-px bg-primary" />
        </div>
      </div>
    </div>
  </div>
);

export const HeroSection: React.FC = () => {
  const heroRef = useScrollProgress<HTMLElement>({
    start: 0,
    end: -0.85,
    reducedValue: 0
  });

  return (
    <section ref={heroRef} className="relative overflow-hidden bg-secondary text-neutral w-full">
      {/* Terracotta cartography on parchment, dissolving gently toward the white canvas below */}
      <div
        data-testid="hero-top-gradient"
        className="absolute inset-0 pointer-events-none will-change-transform"
        style={{
          transform: 'translateY(calc(var(--scroll-progress, 0) * 44px))',
          maskImage: 'linear-gradient(to bottom, #000 0%, #000 72%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 72%, transparent 100%)'
        }}
        aria-hidden="true"
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 55% 60% at 78% 58%, rgba(233, 162, 127, 0.34) 0%, transparent 70%)'
          }}
        />
        <TopoBackdrop animated stroke="#8C4E37" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Brand row: World Scouting rounded badge sits left of Chil on tablet/desktop */}
        <div className="animate-hero-rise flex items-center justify-between sm:justify-start gap-4 sm:gap-5 pt-4 sm:pt-5">
          <div className="order-2 sm:order-1 shrink-0 inline-flex items-center justify-center rounded-xl bg-[#643425] px-3.5 py-2 sm:px-4 sm:py-2.5 shadow-[0_6px_16px_-10px_rgba(46,18,8,0.5)]">
            <img
              src={worldScoutLogo}
              alt="World Scouting"
              width={126}
              height={48}
              fetchPriority="high"
              className="h-7 sm:h-10 lg:h-11 w-auto select-none"
            />
          </div>

          <span
            aria-hidden="true"
            className="hidden sm:block sm:order-2 h-9 w-px bg-[#643425]/25 shrink-0"
          />

          <div className="order-1 sm:order-3 flex items-center gap-3 sm:gap-3.5">
            <img
              src={logo}
              alt="Chil Logo"
              width={64}
              height={62}
              fetchPriority="high"
              className="h-11 sm:h-13 lg:h-14 w-auto select-none"
            />
            <span className="font-display text-3xl sm:text-4xl font-black text-[#643425] tracking-tight">
              Chil
            </span>
          </div>
        </div>

        {/* Split composition: centered vertically between brand row and bottom dissolve */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] items-center gap-9 sm:gap-10 lg:gap-10 pt-10 sm:pt-12 lg:pt-14 pb-10 sm:pb-12 lg:pb-10">
          <div
            className="will-change-transform"
            style={{ transform: 'translateY(calc(var(--scroll-progress, 0) * -20px))' }}
          >
            <h1
              className="animate-hero-rise font-display font-black tracking-tight leading-[0.94] text-[clamp(2.35rem,5vw,4.5rem)] mb-4 sm:mb-5"
              style={{ animationDelay: '70ms' }}
            >
              <span className="block text-[#643425]">Valida registros.</span>{' '}
              <span className="block text-primary">Reconoce rápido.</span>
            </h1>

            <p
              className="animate-hero-rise text-base sm:text-lg lg:text-xl text-neutral max-w-xl leading-relaxed mb-7 sm:mb-8"
              style={{ animationDelay: '140ms' }}
            >
              Sistema Scout de Emisión y Control de Reconocimientos. Valida registros en Impeesa,
              diseña cada reconocimiento en milímetros reales y descarga paquetes por grupo.
            </p>

            <div
              className="animate-hero-rise flex flex-col sm:flex-row gap-3.5 sm:gap-4"
              style={{ animationDelay: '210ms' }}
            >
              <Link
                to="/registro"
                className="group inline-flex items-center justify-center gap-2.5 min-h-[54px] px-8 py-3 rounded-2xl bg-primary text-white text-base sm:text-lg font-bold hover:bg-[#743F2C] active:bg-[#5F3323] hover:-translate-y-0.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-secondary focus-visible:ring-primary"
              >
                Comenzar Ahora
                <ArrowRight
                  className="w-5 h-5 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>

              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2.5 min-h-[54px] px-8 py-3 rounded-2xl border-2 border-neutral text-neutral text-base sm:text-lg font-semibold hover:bg-neutral/5 active:bg-neutral/10 hover:-translate-y-0.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-secondary focus-visible:ring-primary"
              >
                <LogIn className="w-5 h-5 shrink-0" aria-hidden="true" />
                Iniciar Sesión
              </Link>
            </div>
          </div>

          <div className="lg:-mt-4">
            <RecognitionStack />
          </div>
        </div>
      </div>

      {/* Soft multi-stop parchment-to-white atmospheric dissolve into the storytelling canvas */}
      <div
        className="relative z-10 w-full h-16 sm:h-20 lg:h-24 -mb-px pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(241, 234, 216, 0) 0%, rgba(247, 243, 234, 0.45) 38%, rgba(252, 250, 247, 0.85) 74%, #FFFFFF 100%)'
        }}
        aria-hidden="true"
      />
    </section>
  );
};
