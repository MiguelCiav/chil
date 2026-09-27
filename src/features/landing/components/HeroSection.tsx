import React from 'react';
import { Link } from 'react-router-dom';
import { LogIn, ArrowRight } from 'lucide-react';
import logo from '../../../assets/CHIL_LOGO.png';
import worldScoutLogo from '../../../assets/WSCT_LOGO_EN_RGB_NEG.svg';
import { Button } from '../../../components/Button';

export const HeroSection: React.FC = () => {
  return (
    <section className="relative overflow-hidden pt-14 pb-14 sm:pt-18 sm:pb-20 lg:pt-24 lg:pb-28 w-full">
      {/* Top atmospheric angled corner gradient providing backdrop for the white World Scouting logo */}
      <div
        data-testid="hero-top-gradient"
        className="absolute top-0 left-0 right-0 h-[400px] sm:h-[480px] pointer-events-none -z-10 overflow-hidden"
      >
        {/* Deep warm corner anchor for logo contrast and readability */}
        <div className="absolute top-0 left-0 w-full sm:w-[85%] md:w-[70%] lg:w-[58%] h-full hero-scout-gradient" />

        {/* Soft atmospheric gradient on top-right to balance the entire banner */}
        <div className="absolute top-0 right-0 w-full sm:w-[75%] md:w-[55%] lg:w-[45%] h-full hero-right-gradient" />

        {/* Soft top-edge ambient mist blending seamlessly with page header */}
        <div className="absolute top-0 inset-x-0 h-16 hero-top-mist" />
      </div>

      {/* Topographic Contour Texture (Scout Cartography & Trail Map spanning entire banner) */}
      <div className="absolute inset-0 h-[460px] sm:h-[540px] pointer-events-none -z-10 overflow-hidden">
        <svg
          className="w-full h-full object-cover"
          viewBox="0 0 1440 520"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            {/* Dynamic stroke gradient transitioning from white (over dark corner) to primary scout brown (over light center/right) */}
            <linearGradient id="topo-stroke-flow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
              <stop offset="28%" stopColor="#FFFFFF" stopOpacity="0.6" />
              <stop offset="42%" stopColor="#8C4E37" stopOpacity="0.18" />
              <stop offset="68%" stopColor="#8C4E37" stopOpacity="0.14" />
              <stop offset="85%" stopColor="#8C4E37" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#8C4E37" stopOpacity="0.32" />
            </linearGradient>

            <linearGradient id="topo-stroke-accent" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
              <stop offset="28%" stopColor="#FFFFFF" stopOpacity="0.75" />
              <stop offset="42%" stopColor="#8C4E37" stopOpacity="0.22" />
              <stop offset="68%" stopColor="#8C4E37" stopOpacity="0.18" />
              <stop offset="85%" stopColor="#8C4E37" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#8C4E37" stopOpacity="0.42" />
            </linearGradient>

            {/* Ultra-subtle whisper gradient for lower contour lines crossing directly behind the title */}
            <linearGradient id="topo-stroke-whisper" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
              <stop offset="28%" stopColor="#FFFFFF" stopOpacity="0.35" />
              <stop offset="42%" stopColor="#8C4E37" stopOpacity="0.08" />
              <stop offset="68%" stopColor="#8C4E37" stopOpacity="0.06" />
              <stop offset="85%" stopColor="#8C4E37" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#8C4E37" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Concentric elevation loops around top-left crest (radiating behind the World Scouting logo) */}
          <ellipse cx="80" cy="50" rx="140" ry="95" stroke="rgba(255,255,255,0.48)" strokeWidth="1.2" strokeDasharray="3 4" />
          <ellipse cx="80" cy="50" rx="210" ry="145" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
          <ellipse cx="80" cy="50" rx="290" ry="200" stroke="rgba(255,255,255,0.52)" strokeWidth="1.2" />
          <ellipse cx="80" cy="50" rx="380" ry="260" stroke="rgba(255,255,255,0.75)" strokeWidth="1.8" />
          <ellipse cx="80" cy="50" rx="490" ry="335" stroke="url(#topo-stroke-flow)" strokeWidth="1.3" strokeDasharray="6 4" />
          <ellipse cx="80" cy="50" rx="610" ry="415" stroke="url(#topo-stroke-flow)" strokeWidth="1.5" />

          {/* Continuous undulating topographic contour paths flowing across the entire banner */}
          <path
            d="M -40 130 C 180 190, 420 100, 720 160 C 980 220, 1180 120, 1480 180"
            stroke="url(#topo-stroke-flow)"
            strokeWidth="1.2"
          />
          <path
            d="M -40 200 C 200 260, 450 170, 760 230 C 1020 290, 1220 180, 1480 250"
            stroke="url(#topo-stroke-accent)"
            strokeWidth="1.4"
          />
          {/* Lower lines crossing the title: rendered with ultra-subtle whisper opacity to preserve title prominence */}
          <path
            d="M -40 280 C 220 340, 490 240, 800 310 C 1060 370, 1260 250, 1480 320"
            stroke="url(#topo-stroke-whisper)"
            strokeWidth="1"
          />
          <path
            d="M -40 360 C 240 420, 530 310, 840 380 C 1100 440, 1300 320, 1480 390"
            stroke="url(#topo-stroke-whisper)"
            strokeWidth="1.1"
          />
          <path
            d="M -40 440 C 260 500, 570 380, 880 450 C 1140 510, 1340 390, 1480 460"
            stroke="url(#topo-stroke-whisper)"
            strokeWidth="0.8"
            strokeDasharray="4 6"
          />

          {/* Elevation Labels on index contours */}
          <text x="360" y="246" fill="rgba(255,255,255,0.7)" fontSize="9" fontFamily="monospace" letterSpacing="1">1250m</text>
          <text x="1080" y="302" fill="rgba(140,78,55,0.2)" fontSize="9" fontFamily="monospace" letterSpacing="1">1250m</text>

          {/* Complementary concentric elevation loops on the top-right to balance the banner */}
          <ellipse cx="1360" cy="70" rx="150" ry="105" stroke="rgba(140,78,55,0.22)" strokeWidth="1.2" strokeDasharray="3 4" />
          <ellipse cx="1360" cy="70" rx="230" ry="160" stroke="rgba(140,78,55,0.3)" strokeWidth="1.5" />
          <ellipse cx="1360" cy="70" rx="330" ry="230" stroke="rgba(140,78,55,0.22)" strokeWidth="1.2" />
          <ellipse cx="1360" cy="70" rx="440" ry="305" stroke="rgba(140,78,55,0.26)" strokeWidth="1.5" strokeDasharray="6 4" />
        </svg>
      </div>

      {/* Top Left World Scouting Logo */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-8 lg:top-7 lg:left-10 z-20">
        <img
          src={worldScoutLogo}
          alt="World Scouting"
          className="h-7 sm:h-9 lg:h-10 w-auto select-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] hover:scale-105 transition-transform duration-200"
        />
      </div>

      {/* Warm Ambient Lighting Spots (Sunrise & Campfire Glow) */}
      <div className="absolute -top-10 left-[18%] sm:left-[26%] w-72 h-72 sm:w-96 sm:h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-5xl h-96 bg-gradient-to-b from-primary/10 via-amber-100/25 to-transparent blur-3xl -z-10 pointer-events-none rounded-full" />
      <div className="absolute top-1/4 right-[8%] sm:right-[15%] w-72 h-72 sm:w-80 sm:h-80 bg-amber-100/30 rounded-full blur-3xl -z-10 pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">

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
              className="hover:-translate-y-0.5 transition-all text-sm sm:text-base font-bold"
            >
              Comenzar Ahora
            </Button>
          </Link>

          <Link to="/login" className="w-full sm:w-auto flex-1">
            <Button
              size="lg"
              variant="outline"
              fullWidth
              className="border-gray-300 hover:bg-gray-50/80 hover:border-gray-400 hover:-translate-y-0.5 transition-all text-sm sm:text-base font-semibold"
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
