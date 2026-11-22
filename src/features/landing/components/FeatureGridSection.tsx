import React from 'react';
import { useActiveChapter } from '../hooks/useActiveChapter';
import { useScrollProgress } from '../hooks/useScrollProgress';
import { RevealOnScroll } from './RevealOnScroll';
import { TopoBackdrop } from './TopoBackdrop';
import {
  AnalyticsVisual,
  DesignVisual,
  ExportVisual,
  VerifyVisual
} from './ShowcaseVisuals';
import type { LandingChapter } from '../types';

const CHAPTERS: LandingChapter[] = [
  {
    id: 'lotes-masivos',
    number: '01',
    verb: 'Verifica',
    title: 'Pega las cédulas. Chil te dice quién está al día.',
    body: 'Cada registro se consulta en Impeesa y queda ubicado en su rama, grupo, distrito y región. Sin copiar una sola columna.',
    Visual: VerifyVisual
  },
  {
    id: 'disenador-plantillas',
    number: '02',
    verb: 'Diseña',
    title: 'Tu reconocimiento oficial, con cada nombre en su sitio.',
    body: 'Sube el PDF o la imagen, arrastra los campos y ajústalos en milímetros reales. Lo que ves es lo que se imprime.',
    Visual: DesignVisual
  },
  {
    id: 'exportacion-flexible',
    number: '03',
    verb: 'Exporta',
    title: 'Un ZIP por grupo. Listo para entregar.',
    body: 'Descarga los reconocimientos separados por grupo scout junto a su nómina en PDF. Los registros inválidos se quedan fuera.',
    Visual: ExportVisual
  },
  {
    id: 'analitica-territorial',
    number: '04',
    verb: 'Analiza',
    title: 'Tu año completo, de un vistazo.',
    body: 'Compara emisiones por región, distrito, rama y edad contra el año anterior. Llévate el reporte en PDF o Excel.',
    Visual: AnalyticsVisual
  }
];

const Stage: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`relative overflow-hidden rounded-[2rem] bg-[#2E1208] p-5 sm:p-8 ${className}`}>
    <TopoBackdrop />
    <div className="relative">{children}</div>
  </div>
);

export const FeatureGridSection: React.FC = () => {
  const { activeIndex, seen, registerChapter } = useActiveChapter(CHAPTERS.length);
  const headingRef = useScrollProgress<HTMLDivElement>({ start: 0.98, end: 0.62 });

  return (
    <section id="capacidades" aria-labelledby="capacidades-title" className="relative bg-white">
      {/* Oversized statement header flowing directly out of the hero transition */}
      <div
        ref={headingRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 lg:pt-16 pb-6 lg:pb-10"
      >
        <h2
          id="capacidades-title"
          className="font-display font-black tracking-tight text-neutral text-[clamp(2.2rem,6vw,5.25rem)] leading-[0.96] max-w-5xl"
        >
          <span
            className="block will-change-transform"
            style={{
              transform: 'translateY(calc((1 - var(--scroll-progress, 1)) * 14px))',
              opacity: 'calc(0.85 + var(--scroll-progress, 1) * 0.15)'
            }}
          >
            Genera lotes de reconocimientos
          </span>{' '}
          <span
            className="block text-primary will-change-transform"
            style={{
              transform: 'translateY(calc((1 - var(--scroll-progress, 1)) * 24px))',
              opacity: 'calc(0.8 + var(--scroll-progress, 1) * 0.2)'
            }}
          >
            En una sola herramienta
          </span>
        </h2>
        <RevealOnScroll delayMs={150}>
          <p className="mt-6 sm:mt-8 text-lg sm:text-2xl text-neutral/80 leading-snug max-w-2xl">
            De la lista de cédulas al reconocimiento impreso, sin pasar por una hoja de cálculo.
          </p>
        </RevealOnScroll>
      </div>

      {/* Sticky storytelling: chapters scroll on the left, the product stage stays pinned on the right */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 lg:grid lg:grid-cols-2 lg:gap-16 pb-16 lg:pb-24">
        <div>
          {CHAPTERS.map((chapter, index) => {
            const isActive = index === activeIndex;
            return (
              <article
                key={chapter.id}
                id={chapter.id}
                ref={registerChapter(index)}
                aria-labelledby={`${chapter.id}-title`}
                className="scroll-mt-16 py-10 sm:py-14 lg:py-8 lg:min-h-[min(70vh,620px)] flex flex-col justify-center"
              >
                <div className="flex items-end gap-4">
                  <span
                    aria-hidden="true"
                    className={`font-display font-black leading-[0.8] text-[clamp(4.5rem,11vw,8.5rem)] text-transparent [-webkit-text-stroke:2px_#8C4E37] transition-opacity duration-500 ${
                      isActive ? 'lg:opacity-100' : 'lg:opacity-30'
                    }`}
                  >
                    {chapter.number}
                  </span>
                  <span className="pb-2 font-display text-xl sm:text-2xl font-bold text-primary">
                    {chapter.verb}
                  </span>
                </div>
                <h3
                  id={`${chapter.id}-title`}
                  className="mt-5 font-display font-black tracking-tight text-neutral text-[clamp(2rem,4.4vw,3.6rem)] leading-[1.02]"
                >
                  {chapter.title}
                </h3>
                <p className="mt-5 text-lg sm:text-xl text-neutral/80 leading-relaxed max-w-xl">
                  {chapter.body}
                </p>

                {/* Inline stage on phones and tablets */}
                <div className="mt-8 lg:hidden" aria-hidden="true">
                  <Stage>
                    <chapter.Visual active={seen.has(index)} />
                  </Stage>
                </div>
              </article>
            );
          })}
        </div>

        {/* Pinned stage on desktop */}
        <div className="hidden lg:block" aria-hidden="true">
          <div className="sticky top-[min(14vh,112px)] h-[min(76vh,600px)] flex flex-col justify-center gap-6">
            <Stage className="min-h-[440px]">
              <div className="relative min-h-[380px]">
                {CHAPTERS.map((chapter, index) => {
                  const isActive = index === activeIndex;
                  const inactiveTranslate = index < activeIndex ? '-translate-y-10' : 'translate-y-10';
                  return (
                    <div
                      key={chapter.id}
                      className={`absolute inset-0 flex items-center transition-all duration-700 ease-out ${
                        isActive
                          ? 'opacity-100 translate-y-0 scale-100'
                          : `opacity-0 scale-[0.96] pointer-events-none ${inactiveTranslate}`
                      }`}
                    >
                      <chapter.Visual active={isActive} />
                    </div>
                  );
                })}
              </div>
            </Stage>

            {/* Chapter progress rail */}
            <div className="flex items-center gap-3">
              {CHAPTERS.map((chapter, index) => (
                <div key={chapter.id} className="flex-1 space-y-2">
                  <div className="h-1.5 rounded-full bg-primary/15 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-primary transition-[width] duration-500 ease-out ${
                        index <= activeIndex ? 'w-full' : 'w-0'
                      }`}
                    />
                  </div>
                  <p
                    className={`text-sm font-bold transition-colors ${
                      index === activeIndex ? 'text-primary' : 'text-neutral/75'
                    }`}
                  >
                    {chapter.verb}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
