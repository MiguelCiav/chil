import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MousePointer2,
  FileArchive,
  Download
} from 'lucide-react';
import logo from '../../../assets/CHIL_LOGO.png';
import { SCOUT_UNITS, ScoutUnit } from '../../../types';
import type { ShowcaseVisualProps } from '../types';

export type { ShowcaseVisualProps };

const delay = (active: boolean, ms: number): React.CSSProperties => ({
  transitionDelay: active ? `${ms}ms` : '0ms'
});

/* -------------------------------------------------------------------------- */
/* 01 · Verificación contra Impeesa                                           */
/* -------------------------------------------------------------------------- */

const VERIFY_ROWS: Array<{
  name: string;
  place: string;
  unit: ScoutUnit;
  status: 'ok' | 'exceptional' | 'invalid';
}> = [
  { name: 'Lucía Márquez', place: 'Grupo 45 · Dtto. Metropolitano', unit: 'manada', status: 'ok' },
  { name: 'Carlos Mendoza', place: 'Grupo 45 · Dtto. Metropolitano', unit: 'tropa', status: 'ok' },
  { name: 'Diego Rivas', place: 'Grupo Pioneros · Región Central', unit: 'caminantes', status: 'exceptional' },
  { name: 'Registro sin ficha', place: 'Sin grupo en el padrón', unit: 'no_scout', status: 'invalid' }
];

const VERIFY_STATUS = {
  ok: {
    label: 'Vigente',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />
  },
  exceptional: {
    label: 'Excepcional',
    className: 'bg-purple-50 text-purple-800 border-purple-200',
    icon: <AlertTriangle className="w-3.5 h-3.5" />
  },
  invalid: {
    label: 'Inválido',
    className: 'bg-rose-50 text-rose-800 border-rose-200',
    icon: <XCircle className="w-3.5 h-3.5" />
  }
} as const;

export const VerifyVisual: React.FC<ShowcaseVisualProps> = ({ active }) => (
  <div className="relative w-full rounded-2xl bg-white p-4 sm:p-5 overflow-hidden">
    <div className="flex items-center justify-between gap-3 pb-3 border-b border-primary/15">
      <span className="font-display text-base sm:text-lg font-bold text-neutral">Lote de muestra</span>
      <span className="font-mono text-xs font-bold text-primary bg-primary/10 rounded-lg px-2 py-1">
        Impeesa
      </span>
    </div>

    <ul className="relative mt-3 space-y-2">
      {/* Scan line sweeping the rows while verification runs */}
      <span
        className={`absolute inset-x-0 h-10 -top-10 bg-gradient-to-b from-transparent via-primary/15 to-transparent pointer-events-none transition-transform duration-[1400ms] ease-in-out ${
          active ? 'translate-y-[360px]' : 'translate-y-0'
        }`}
      />
      {VERIFY_ROWS.map((row, i) => {
        const unit = SCOUT_UNITS[row.unit];
        const status = VERIFY_STATUS[row.status];
        return (
          <li
            key={row.name}
            style={delay(active, 180 + i * 220)}
            className={`flex items-center justify-between gap-3 rounded-xl border border-primary/15 bg-[#FAF8F5] px-3 py-2.5 transition-all duration-500 ease-out ${
              active ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'
            }`}
          >
            <div className="min-w-0">
              <p className="text-sm font-bold text-neutral truncate">{row.name}</p>
              <p className="text-xs text-neutral/75 truncate">{row.place}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-xs font-bold border ${unit.badgeClass}`}
              >
                {unit.label}
              </span>
              <span
                style={delay(active, 520 + i * 220)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold border transition-all duration-300 ${
                  status.className
                } ${active ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
              >
                {status.icon}
                {status.label}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  </div>
);

/* -------------------------------------------------------------------------- */
/* 02 · Diseñador 1:1                                                         */
/* -------------------------------------------------------------------------- */

export const DesignVisual: React.FC<ShowcaseVisualProps> = ({ active }) => (
  <div className="relative w-full rounded-2xl bg-white p-3 sm:p-4">
    <div className="relative aspect-[297/210] w-full rounded-xl bg-[#FAF8F5] border border-primary/30 overflow-hidden">
      <div className="absolute inset-2.5 rounded-lg border-2 border-primary/25" />

      {/* Snap guidelines drawing in */}
      <span
        className={`absolute left-1/2 top-3 bottom-3 w-px border-l border-dashed border-sky-700 origin-top transition-transform duration-700 ease-out ${
          active ? 'scale-y-100' : 'scale-y-0'
        }`}
      />
      <span
        style={delay(active, 200)}
        className={`absolute top-[52%] left-3 right-3 h-px border-t border-dashed border-sky-700 origin-left transition-transform duration-700 ease-out ${
          active ? 'scale-x-100' : 'scale-x-0'
        }`}
      />

      <img
        src={logo}
        alt=""
        width={36}
        height={35}
        className="absolute top-4 left-4 h-8 sm:h-9 w-auto object-contain"
      />
      <span className="absolute top-4 right-4 font-mono text-[10px] sm:text-xs font-bold text-primary">
        297 × 210 mm
      </span>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-center px-6">
        <p
          style={delay(active, 350)}
          className={`font-display text-xs sm:text-sm font-bold text-primary transition-all duration-500 ${
            active ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6'
          }`}
        >
          Mensajeros de la Paz
        </p>
        <p
          style={delay(active, 550)}
          className={`font-display text-lg sm:text-2xl font-black text-neutral tracking-tight rounded px-2 transition-all duration-500 ${
            active
              ? 'opacity-100 translate-x-0 ring-2 ring-sky-700/70'
              : 'opacity-0 translate-x-16 ring-0'
          }`}
        >
          Carlos Eduardo Mendoza
        </p>
        <p
          style={delay(active, 750)}
          className={`text-[11px] sm:text-xs text-neutral/75 transition-all duration-500 ${
            active ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          Región Capital · Grupo Scouts 45
        </p>
      </div>

      <span className="absolute bottom-4 right-4 font-mono text-[10px] sm:text-xs font-bold text-primary">
        REC-45-001
      </span>

      {/* Pointer dragging the name field into place */}
      <MousePointer2
        style={delay(active, 550)}
        className={`absolute w-5 h-5 sm:w-6 sm:h-6 text-neutral fill-white drop-shadow transition-all duration-700 ease-out ${
          active ? 'left-[66%] top-[55%] opacity-100' : 'left-[92%] top-[80%] opacity-0'
        }`}
      />
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/* 03 · Exportación por grupo                                                 */
/* -------------------------------------------------------------------------- */

const ZIP_FILES = [
  'Grupo_Scouts_45.zip',
  'Grupo_Pioneros.zip',
  'Clan_Rover_8.zip'
];

export const ExportVisual: React.FC<ShowcaseVisualProps> = ({ active }) => (
  <div className="relative w-full rounded-2xl bg-white p-4 sm:p-5 space-y-4">
    <div className="space-y-2">
      <div className="relative h-5 text-sm font-bold text-neutral">
        <span
          style={delay(active, 1700)}
          className={`absolute inset-0 transition-opacity duration-300 ${active ? 'opacity-0' : 'opacity-100'}`}
        >
          Generando reconocimientos en PDF…
        </span>
        <span
          style={delay(active, 1700)}
          className={`absolute inset-0 inline-flex items-center gap-1.5 text-emerald-800 transition-opacity duration-300 ${
            active ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Listo para entregar
        </span>
      </div>
      <div className="h-3 w-full rounded-full bg-primary/10 overflow-hidden">
        <div
          className={`h-full rounded-full bg-primary transition-[width] duration-[1600ms] ease-out ${
            active ? 'w-full' : 'w-0'
          }`}
        />
      </div>
    </div>

    <ul className="space-y-2">
      {ZIP_FILES.map((file, i) => (
        <li
          key={file}
          style={delay(active, 500 + i * 380)}
          className={`flex items-center justify-between gap-3 rounded-xl border border-primary/15 bg-[#FAF8F5] px-3 py-2.5 transition-all duration-500 ease-out ${
            active ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
        >
          <span className="inline-flex items-center gap-2 min-w-0">
            <FileArchive className="w-4 h-4 text-primary shrink-0" />
            <span className="font-mono text-xs sm:text-sm font-bold text-neutral truncate">{file}</span>
          </span>
          <Download className="w-4 h-4 text-neutral/75 shrink-0" />
        </li>
      ))}
    </ul>

    <p className="text-xs text-neutral/75">Los registros inválidos quedan fuera de cada paquete.</p>
  </div>
);

/* -------------------------------------------------------------------------- */
/* 04 · Analítica interanual                                                  */
/* -------------------------------------------------------------------------- */

const BARS = [
  { label: 'Ene', current: 46, previous: 30 },
  { label: 'Feb', current: 70, previous: 42 },
  { label: 'Mar', current: 58, previous: 50 },
  { label: 'Abr', current: 86, previous: 54 },
  { label: 'May', current: 74, previous: 60 },
  { label: 'Jun', current: 96, previous: 66 }
];

const DONUT_RADIUS = 36;
const DONUT_LENGTH = 2 * Math.PI * DONUT_RADIUS;
const DONUT_SEGMENTS = [
  { share: 0.58, color: '#0284c7', label: 'Jóvenes', start: 0 },
  { share: 0.42, color: '#8C4E37', label: 'Adultos', start: 0.58 }
];

export const AnalyticsVisual: React.FC<ShowcaseVisualProps> = ({ active }) => {
  return (
    <div className="relative w-full rounded-2xl bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-primary/15">
        <span className="font-display text-base sm:text-lg font-bold text-neutral">Año actual vs. anterior</span>
        <span className="inline-flex items-center gap-3 text-xs font-semibold text-neutral/75">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#0284c7]" /> Actual
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#cbd5e1] border border-[#64748b]" /> Anterior
          </span>
        </span>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto] gap-4 items-end">
        <div className="grid grid-cols-6 gap-2 h-36 sm:h-44 items-end">
          {BARS.map((bar, i) => (
            <div key={bar.label} className="flex flex-col items-center gap-1.5 h-full justify-end">
              <div className="flex items-end gap-1 h-full w-full justify-center">
                <div
                  style={{ ...delay(active, i * 110), height: active ? `${bar.current}%` : '0%' }}
                  className="w-2.5 sm:w-3.5 rounded-t bg-[#0284c7] transition-[height] duration-700 ease-out"
                />
                <div
                  style={{ ...delay(active, 60 + i * 110), height: active ? `${bar.previous}%` : '0%' }}
                  className="w-2.5 sm:w-3.5 rounded-t bg-[#cbd5e1] border border-[#64748b] transition-[height] duration-700 ease-out"
                />
              </div>
              <span className="text-[10px] sm:text-xs font-semibold text-neutral/75">{bar.label}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-2">
          <svg viewBox="0 0 100 100" aria-hidden="true" className="w-20 h-20 sm:w-24 sm:h-24 -rotate-90">
            <circle cx="50" cy="50" r={DONUT_RADIUS} fill="none" stroke="#F1EAD8" strokeWidth="14" />
            {DONUT_SEGMENTS.map((segment, i) => {
              const length = segment.share * DONUT_LENGTH;
              const dashOffset = -segment.start * DONUT_LENGTH;
              return (
                <circle
                  key={segment.label}
                  cx="50"
                  cy="50"
                  r={DONUT_RADIUS}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="14"
                  strokeDasharray={`${active ? length : 0} ${DONUT_LENGTH}`}
                  strokeDashoffset={dashOffset}
                  style={delay(active, 500 + i * 350)}
                  className="transition-[stroke-dasharray] duration-700 ease-out"
                />
              );
            })}
          </svg>
          <div className="flex flex-col gap-0.5 text-[10px] sm:text-xs font-semibold text-neutral/75">
            {DONUT_SEGMENTS.map((segment) => (
              <span key={segment.label} className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: segment.color }} />
                {segment.label}
              </span>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs text-neutral/75">Datos ilustrativos. Exporta el reporte en PDF A4 o Excel.</p>
    </div>
  );
};
