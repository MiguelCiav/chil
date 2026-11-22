import React, { useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { useScrollProgress } from '../hooks/useScrollProgress';
import type { ManifestoLine, ProductFactItem } from '../types';
import { RevealOnScroll } from './RevealOnScroll';

const MARQUEE_ROW_PRIMARY = [
  'Mensajeros de la Paz',
  'Scouts del Mundo',
  'Desafío de Nutrición',
  'Desafío de Constructores de Mentes',
  'He for She',
  'Desafío de Innovadores de Impacto',
  'Desafío de Inteligencia Emocional en acción',
  'Scouts Go Solar'
];

const MARQUEE_ROW_SECONDARY = [
  'Plastic Tide Turners',
  'Campeones de la Naturaleza',
  'Robots Letales',
  'En-señas',
  'Diálogo Interreligioso',
  'Mundo Seguro',
  'Guardianes Alimentarios'
];

const ALL_RECOGNITIONS = [...MARQUEE_ROW_PRIMARY, ...MARQUEE_ROW_SECONDARY];

const MANIFESTO_LINES: ManifestoLine[] = [
  { text: 'Menos tiempo en planillas.', accent: false },
  { text: 'Más tiempo para tus objetivos.', accent: true }
];

const PROOFS: ProductFactItem[] = [
  {
    figure: '1:1',
    title: 'Lo que diseñas es lo que imprimes',
    body: 'El PDF final respeta cada milímetro de la vista previa.'
  },
  {
    figure: '6',
    title: 'Ramas y categorías reconocidas',
    body: 'Manada, Tropa, Caminantes, Clan, Institucional y No scout.'
  },
  {
    figure: 'AES-256',
    title: 'Credenciales cifradas',
    body: 'Tu sesión de Impeesa se guarda cifrada en el servidor, con acceso aislado por cuenta.'
  }
];

const ScrollMarquee: React.FC = () => {
  const [isPaused, setIsPaused] = useState(false);

  return (
    <div
      aria-label="Reconocimientos Scouts"
      className="relative bg-[#2E1208] border-y border-primary/40 py-8 sm:py-12 overflow-hidden"
    >
      {/* Subtle warm radial glow anchoring the dark band to the Hero and Stage palette */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 85% at 50% 50%, rgba(140, 78, 55, 0.28) 0%, transparent 72%)'
        }}
      />

      {/* Screen-reader catalog list without visual track duplication */}
      <p className="sr-only">Reconocimientos: {ALL_RECOGNITIONS.join(', ')}.</p>

      {/* Band header with accessible pause/play control (WCAG 2.2.2 / R-39) */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6 flex items-center justify-between gap-4">
        <p className="text-xs sm:text-sm font-semibold text-[#F1EAD8]/90">
          Reconocimientos del programa y desafíos Scouts
        </p>
        <button
          type="button"
          onClick={() => setIsPaused((prev) => !prev)}
          aria-pressed={isPaused}
          aria-label={isPaused ? 'Reanudar cinta de reconocimientos' : 'Pausar cinta de reconocimientos'}
          className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl border border-[#F1EAD8]/55 bg-[#2E1208]/90 text-xs sm:text-sm font-semibold text-[#F1EAD8] hover:bg-primary/40 active:bg-primary/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#2E1208] focus-visible:ring-white shrink-0"
        >
          {isPaused ? (
            <>
              <Play className="w-4 h-4 shrink-0" aria-hidden="true" />
              Reanudar
            </>
          ) : (
            <>
              <Pause className="w-4 h-4 shrink-0" aria-hidden="true" />
              Pausar
            </>
          )}
        </button>
      </div>

      {/* Edge fades so items enter and leave the dark band cleanly */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 sm:w-20 bg-gradient-to-r from-[#2E1208] to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 sm:w-20 bg-gradient-to-l from-[#2E1208] to-transparent"
      />

      {/* Row 1: Warm Parchment (#F1EAD8, 14.51:1) with Scout Sky (#6CB7DE) dots */}
      <div aria-hidden="true" className="relative select-none overflow-hidden">
        <div
          className="flex w-max animate-marquee-left hover:[animation-play-state:paused] will-change-transform"
          style={isPaused ? { animationPlayState: 'paused' } : undefined}
        >
          {[0, 1].map((copy) => (
            <div key={`row-a-${copy}`} className="flex items-center shrink-0">
              {MARQUEE_ROW_PRIMARY.map((item) => (
                <span
                  key={`a-${copy}-${item}`}
                  className="inline-flex items-center gap-6 sm:gap-9 pr-6 sm:pr-9 font-display font-black text-[clamp(2rem,4.8vw,3.75rem)] leading-none text-[#F1EAD8] whitespace-nowrap"
                >
                  {item}
                  <span className="w-2.5 h-2.5 rounded-full bg-[#6CB7DE] shrink-0" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Row 2: Warm Apricot (#E9A27F, 8.24:1) moving in opposite direction */}
      <div aria-hidden="true" className="relative mt-5 sm:mt-7 select-none overflow-hidden">
        <div
          className="flex w-max animate-marquee-right hover:[animation-play-state:paused] will-change-transform"
          style={isPaused ? { animationPlayState: 'paused' } : undefined}
        >
          {[0, 1].map((copy) => (
            <div key={`row-b-${copy}`} className="flex items-center shrink-0">
              {MARQUEE_ROW_SECONDARY.map((item) => (
                <span
                  key={`b-${copy}-${item}`}
                  className="inline-flex items-center gap-6 sm:gap-9 pr-6 sm:pr-9 font-display font-black text-[clamp(2rem,4.8vw,3.75rem)] leading-none text-[#E9A27F] whitespace-nowrap"
                >
                  {item}
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F1EAD8]/60 shrink-0" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ManifestoReveal: React.FC = () => {
  // Attach progress measurement directly to the heading (excluding outer padding)
  // so every word reaches full opacity as soon as the entire heading is visible in view.
  const ref = useScrollProgress<HTMLHeadingElement>({ start: 0.96, end: 0.8 });
  const words = MANIFESTO_LINES.flatMap((line, lineIndex) =>
    line.text.split(' ').map((word) => ({ word, accent: line.accent, lineIndex }))
  );
  const total = words.length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
      <h2
        ref={ref}
        className="font-display font-black tracking-tight text-[clamp(2.75rem,8vw,7rem)] leading-[0.98]"
      >
        <span className="sr-only">{MANIFESTO_LINES.map((line) => line.text).join(' ')}</span>
        <span aria-hidden="true">
          {MANIFESTO_LINES.map((line, lineIndex) => (
            <span key={line.text} className="block">
              {words
                .map((entry, index) => ({ ...entry, index }))
                .filter((entry) => entry.lineIndex === lineIndex)
                .map(({ word, accent, index }) => (
                  <span
                    key={`${word}-${index}`}
                    className={`inline-block mr-[0.22em] ${accent ? 'text-primary' : 'text-neutral'}`}
                    style={{
                      opacity: `clamp(0.18, calc(var(--scroll-progress, 1) * ${total + 1} - ${index}), 1)`
                    }}
                  >
                    {word}
                  </span>
                ))}
            </span>
          ))}
        </span>
      </h2>
    </div>
  );
};

export const WorkflowSection: React.FC = () => {
  return (
    <section id="proceso" aria-label="Por qué Chil" className="relative bg-white">
      <ScrollMarquee />
      <ManifestoReveal />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 sm:pb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 border-t-2 border-neutral pt-12">
          {PROOFS.map((proof, index) => (
            <RevealOnScroll key={proof.figure} delayMs={index * 140}>
              <div className="space-y-4">
                <p className="font-display font-black text-primary leading-none tracking-tight text-[clamp(3.5rem,8vw,6.5rem)]">
                  {proof.figure}
                </p>
                <h3 className="font-display text-2xl sm:text-3xl font-black text-neutral tracking-tight">
                  {proof.title}
                </h3>
                <p className="text-base sm:text-lg text-neutral/80 leading-relaxed max-w-sm">{proof.body}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
};
