import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  LogIn,
  Zap,
  Award,
  CheckCircle2,
  Shield,
  ArrowRight,
  QrCode
} from 'lucide-react';
import logo from '../../../assets/CHIL_LOGO.png';
import { Button } from '../../../components/Button';

export const HeroSection: React.FC = () => {
  return (
    <section className="relative overflow-hidden pt-4 pb-12 sm:pt-8 sm:pb-16 lg:pb-20">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-tr from-primary/15 via-amber-100/30 to-tertiary/10 blur-3xl -z-10 pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Headline & Actions */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Scout Badge Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm font-semibold shadow-xs">
              <Shield className="w-4 h-4 text-primary" />
              <span>Plataforma Oficial para el Movimiento Scout</span>
            </div>

            {/* Title & Logo */}
            <div className="space-y-3">
              <div className="flex items-center justify-center lg:justify-start gap-3">
                <img
                  src={logo}
                  alt="Chil Logo"
                  className="h-12 w-auto sm:h-14 drop-shadow-sm"
                />
                <span className="text-3xl sm:text-4xl font-black text-primary tracking-tight">
                  Chil
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-neutral tracking-tight leading-tight">
                Chil — Sistema de Emisión y Control de Reconocimientos Scouts
              </h1>
            </div>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-neutral/80 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              La plataforma moderna, ágil y oficial para gestionar lotes de reconocimientos, diseñar diplomas visuales interactivos y generar analítica territorial en el Movimiento Scout.
            </p>

            {/* CTA Buttons & Fast Action */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5">
                <Link to="/registro" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="primary"
                    fullWidth
                    className="shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all text-sm sm:text-base font-bold"
                    icon={<Sparkles className="w-5 h-5 text-amber-300" />}
                  >
                    🚀 Comenzar Ahora / Registrarse
                  </Button>
                </Link>

                <Link to="/login" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    fullWidth
                    className="border-gray-300 hover:bg-gray-50 text-sm sm:text-base font-semibold"
                    icon={<LogIn className="w-5 h-5 text-neutral/70" />}
                  >
                    🔐 Iniciar Sesión
                  </Button>
                </Link>
              </div>

              {/* Quick action link */}
              <div className="flex items-center justify-center lg:justify-start">
                <a
                  href="#emision-rapida"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors group cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500 group-hover:scale-110 transition-transform" />
                  <span>⚡ Conoce la Emisión Rápida</span>
                  <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>

            {/* Trust points */}
            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-200/80 text-xs sm:text-sm text-neutral/70 max-w-xl mx-auto lg:mx-0">
              <div className="flex items-center justify-center lg:justify-start gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span>100% Digital</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span>Verificación Oficial</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span>Códigos Antifraude</span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Mock Preview Card */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Outer decorative card frame */}
              <div className="relative rounded-2xl bg-gradient-to-br from-amber-50 via-white to-orange-50/50 p-6 sm:p-7 shadow-xl border-2 border-primary/20 space-y-5 transition-transform hover:-translate-y-1 duration-300">
                {/* Certificate top header */}
                <div className="flex items-center justify-between border-b border-amber-200/60 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <Award className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider font-bold text-primary/80">
                        Asociación de Scouts de Venezuela
                      </p>
                      <h3 className="text-sm font-bold text-neutral">
                        Certificado Oficial de Reconocimiento
                      </h3>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 border border-green-300">
                    VÁLIDO
                  </span>
                </div>

                {/* Certificate main content mock */}
                <div className="space-y-3 py-1 text-center">
                  <p className="text-xs text-neutral/60 italic font-serif">
                    Se otorga con orgullo y felicitación a:
                  </p>
                  <h4 className="text-xl font-black text-neutral tracking-tight">
                    Mariana Rojas Cadenas
                  </h4>
                  <div className="inline-block px-3 py-1 rounded-lg bg-amber-100/70 border border-amber-300 text-amber-900 text-xs font-semibold">
                    ⭐ Mérito Scout de Bronce
                  </div>
                  <p className="text-xs text-neutral/70 leading-snug">
                    Por su sobresaliente compromiso, espíritu de servicio y vivencia de la Ley y Promesa Scout en la comunidad.
                  </p>
                </div>

                {/* Metadata & Tag Badges Required */}
                <div className="bg-white/80 rounded-xl p-3 border border-amber-200/70 space-y-2">
                  <div className="text-[11px] font-semibold text-neutral/60 uppercase tracking-wider">
                    Metadatos de Emisión:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-gray-100 text-neutral border border-gray-300">
                      🪪 V-12.345.678
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                      ⚜️ Tropa Scout
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                      🔖 REC-8F3A2B
                    </span>
                  </div>
                </div>

                {/* Footer seal and simulated QR code */}
                <div className="flex items-center justify-between pt-2 border-t border-amber-200/60 text-xs text-neutral/60">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <QrCode className="w-5 h-5 text-neutral/70" />
                    <span>Verificación QR instantánea</span>
                  </div>
                  <span className="font-semibold text-primary text-[11px]">
                    Distrito Sucre • Región Capital
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
