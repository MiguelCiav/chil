import React from 'react';

interface YoYVariationBadgeProps {
  diff: number;
  percentChange: number | null;
  className?: string;
}

export const YoYVariationBadge: React.FC<YoYVariationBadgeProps> = ({
  diff,
  percentChange,
  className = ''
}) => {
  if (diff > 0) {
    const text = percentChange !== null ? `+${diff} (+${percentChange}%)` : `+${diff}`;
    return (
      <span
        className={`inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/70 whitespace-nowrap ${className}`}
        title={`Incremento de ${diff} respecto al año anterior`}
      >
        <span aria-hidden="true">↑</span>
        <span>{text}</span>
      </span>
    );
  }

  if (diff < 0) {
    const text = percentChange !== null ? `${diff} (${percentChange}%)` : `${diff}`;
    return (
      <span
        className={`inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/70 whitespace-nowrap ${className}`}
        title={`Disminución de ${Math.abs(diff)} respecto al año anterior`}
      >
        <span aria-hidden="true">↓</span>
        <span>{text}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/70 whitespace-nowrap ${className}`}
      title="Sin variación respecto al año anterior"
    >
      <span aria-hidden="true">=</span>
      <span>0 (0%)</span>
    </span>
  );
};
