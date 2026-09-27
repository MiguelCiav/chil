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
        className="absolute top-0 left-0 right-0 h-[360px] sm:h-[440px] pointer-events-none -z-10 overflow-hidden"
      >
        {/* Deep warm corner anchor for logo contrast and readability */}
        <div className="absolute top-0 left-0 w-full sm:w-[75%] lg:w-[55%] h-full bg-[radial-gradient(ellipse_100%_80%_at_top_left,#220D06_0%,#38150B_30%,#542112/80_55%,#8C4E37/20_75%,transparent_100%)]" />

        {/* Soft top-edge ambient mist blending seamlessly with page header */}
        <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-[#220D06]/40 via-[#38150B]/10 to-transparent" />
      </div>

      {/* Topographic Contour Texture (Scout Cartography & Trail Map) */}
      <div className="absolute inset-0 h-[420px] pointer-events-none -z-10 overflow-hidden opacity-25">
        <svg
          className="w-full h-full object-cover [mask-image:radial-gradient(ellipse_85%_75%_at_top_left,black_25%,transparent_85%)]"
          viewBox="0 0 1200 420"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Topographic elevation contour lines */}
          <path
            d="M-50 40 C150 90, 280 20, 480 80 C680 140, 850 70, 1050 120 C1150 145, 1250 90, 1300 110"
            stroke="#FFF"
            strokeWidth="1"
            strokeOpacity="0.3"
            strokeDasharray="4 6"
          />
          <path
            d="M-50 90 C180 150, 320 60, 520 130 C720 200, 890 120, 1100 170 C1180 190, 1260 150, 1300 160"
            stroke="#FFF"
            strokeWidth="1.2"
            strokeOpacity="0.4"
          />
          <path
            d="M-50 150 C200 210, 350 120, 560 190 C770 260, 930 170, 1140 220 C1200 235, 1270 210, 1300 215"
            stroke="#FFF"
            strokeWidth="0.8"
            strokeOpacity="0.3"
          />
          <path
            d="M-50 210 C220 270, 390 180, 600 250 C810 320, 970 230, 1180 280 C1230 295, 1280 270, 1300 275"
            stroke="#FFF"
            strokeWidth="1.5"
            strokeOpacity="0.45"
          />
          <path
            d="M-50 280 C240 340, 430 250, 650 310 C860 370, 1010 300, 1220 340 C1260 350, 1290 330, 1300 335"
            stroke="#FFF"
            strokeWidth="0.8"
            strokeOpacity="0.25"
          />
          <path
            d="M-50 350 C260 410, 470 320, 700 380 C910 430, 1060 370, 1250 400"
            stroke="#FFF"
            strokeWidth="1"
            strokeOpacity="0.2"
          />
          {/* Concentric elevation loops around top-left crest */}
          <ellipse cx="60" cy="40" rx="90" ry="60" stroke="#FFF" strokeWidth="1" strokeOpacity="0.35" />
          <ellipse cx="60" cy="40" rx="150" ry="100" stroke="#FFF" strokeWidth="0.75" strokeOpacity="0.3" />
          <ellipse cx="60" cy="40" rx="220" ry="145" stroke="#FFF" strokeWidth="1.2" strokeOpacity="0.35" strokeDasharray="3 5" />
          <ellipse cx="60" cy="40" rx="300" ry="195" stroke="#FFF" strokeWidth="0.75" strokeOpacity="0.25" />
          <ellipse cx="60" cy="40" rx="390" ry="250" stroke="#FFF" strokeWidth="1" strokeOpacity="0.2" />
          {/* Subtle compass mark */}
          <g transform="translate(190, 26)" stroke="#FFF" strokeOpacity="0.35" strokeWidth="0.75">
            <line x1="0" y1="-8" x2="0" y2="8" />
            <line x1="-8" y1="0" x2="8" y2="0" />
            <circle cx="0" cy="0" r="3" fill="none" />
          </g>
        </svg>
      </div>

      {/* Top Left World Scouting Logo */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-8 lg:top-7 lg:left-10 z-20">
        <img
          src={worldScoutLogo}
          alt="World Scouting"
          className="h-7 sm:h-9 lg:h-10 w-auto select-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)] hover:scale-105 transition-transform duration-200"
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
