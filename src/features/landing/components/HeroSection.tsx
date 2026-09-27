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
        className="absolute top-0 left-0 right-0 h-[380px] sm:h-[460px] pointer-events-none -z-10 overflow-hidden"
      >
        {/* Deep warm corner anchor for logo contrast and readability */}
        <div className="absolute top-0 left-0 w-full sm:w-[85%] md:w-[70%] lg:w-[58%] h-full hero-scout-gradient" />

        {/* Soft top-edge ambient mist blending seamlessly with page header */}
        <div className="absolute top-0 inset-x-0 h-16 hero-top-mist" />
      </div>

      {/* Topographic Contour Texture (Scout Cartography & Trail Map) */}
      <div className="absolute top-0 left-0 w-full sm:w-[85%] md:w-[72%] lg:w-[60%] h-[380px] sm:h-[460px] pointer-events-none -z-10 overflow-hidden">
        <svg
          className="w-full h-full object-cover"
          viewBox="0 0 800 460"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            {/* Soft fade-out mask for the outer gradient edges */}
            <radialGradient id="topo-mask" cx="15%" cy="15%" r="85%">
              <stop offset="0%" stopColor="#fff" stopOpacity="1" />
              <stop offset="65%" stopColor="#fff" stopOpacity="0.85" />
              <stop offset="85%" stopColor="#fff" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
            <mask id="topo-fade">
              <rect width="800" height="460" fill="url(#topo-mask)" />
            </mask>
          </defs>

          <g mask="url(#topo-fade)">
            {/* Concentric elevation loops radiating outward from the logo crest */}
            <ellipse cx="70" cy="50" rx="140" ry="95" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" strokeDasharray="3 4" />
            <ellipse cx="70" cy="50" rx="210" ry="145" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5" />
            <ellipse cx="70" cy="50" rx="290" ry="200" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" />
            <ellipse cx="70" cy="50" rx="380" ry="260" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" />
            <ellipse cx="70" cy="50" rx="480" ry="330" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" strokeDasharray="6 4" />
            <ellipse cx="70" cy="50" rx="590" ry="405" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />

            {/* Topographic elevation wavy contour paths */}
            <path
              d="M -20 120 C 140 180, 240 110, 420 170 C 580 230, 680 160, 820 210"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="1.2"
            />
            <path
              d="M -20 190 C 160 250, 280 170, 480 240 C 640 300, 720 230, 820 280"
              stroke="rgba(255,255,255,0.68)"
              strokeWidth="1.6"
            />
            <path
              d="M -20 270 C 180 330, 320 240, 530 310 C 690 370, 750 310, 820 350"
              stroke="rgba(255,255,255,0.48)"
              strokeWidth="1.2"
            />
            <path
              d="M -20 350 C 200 410, 370 320, 580 390 C 720 440, 780 380, 820 420"
              stroke="rgba(255,255,255,0.62)"
              strokeWidth="1.5"
            />

            {/* Elevation Labels on index contours */}
            <text x="360" y="236" fill="rgba(255,255,255,0.7)" fontSize="9" fontFamily="monospace" letterSpacing="1">1250m</text>
            <text x="440" y="306" fill="rgba(255,255,255,0.6)" fontSize="9" fontFamily="monospace" letterSpacing="1">1200m</text>

            {/* Scout Compass Rose & Orienteering Coordinates Marker */}
            <g transform="translate(260, 92)">
              {/* Outer compass ring */}
              <circle cx="0" cy="0" r="18" stroke="rgba(255,255,255,0.65)" strokeWidth="1" fill="rgba(0,0,0,0.18)" />
              <circle cx="0" cy="0" r="14" stroke="rgba(255,255,255,0.35)" strokeWidth="0.75" strokeDasharray="2 3" />
              {/* Compass Needle / Star */}
              <polygon points="0,-13 3,-3 0,-1 -3,-3" fill="rgba(255,255,255,0.98)" />
              <polygon points="0,13 3,3 0,1 -3,3" fill="rgba(255,255,255,0.5)" />
              <polygon points="13,0 3,3 1,0 3,-3" fill="rgba(255,255,255,0.55)" />
              <polygon points="-13,0 -3,3 -1,0 -3,-3" fill="rgba(255,255,255,0.55)" />
              <circle cx="0" cy="0" r="2" fill="white" />
              {/* Cardinal North label */}
              <text x="0" y="-17" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">N</text>
              {/* Coordinates / Map Legend Tag */}
              <text x="26" y="-3" fill="rgba(255,255,255,0.9)" fontSize="8.5" fontWeight="600" letterSpacing="0.5">
                SCOUT ORIENTEERING
              </text>
              <text x="26" y="8" fill="rgba(255,255,255,0.65)" fontSize="7.5" fontFamily="monospace">
                08° 18' N · 66° 56' W
              </text>
            </g>
          </g>
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
