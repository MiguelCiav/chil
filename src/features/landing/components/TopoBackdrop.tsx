import React from 'react';

interface TopoBackdropProps {
  className?: string;
  /** Slowly drifts the dashed contour lines (disabled under reduced motion via CSS). */
  animated?: boolean;
  /** Stroke color for the contour lines. */
  stroke?: string;
}

/**
 * Decorative topographic contour lines (Scout cartography motif).
 * Always aria-hidden and pointer-events-none.
 */
export const TopoBackdrop: React.FC<TopoBackdropProps> = ({
  className = '',
  animated = false,
  stroke = '#F1EAD8'
}) => (
  <svg
    aria-hidden="true"
    className={`pointer-events-none absolute inset-0 w-full h-full ${className}`}
    viewBox="0 0 800 600"
    preserveAspectRatio="xMidYMid slice"
    fill="none"
  >
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <ellipse
        key={`ring-${i}`}
        cx="680"
        cy="90"
        rx={90 + i * 85}
        ry={60 + i * 60}
        stroke={stroke}
        strokeOpacity={0.2 - i * 0.025}
        strokeWidth="1.2"
        strokeDasharray={i % 2 === 0 ? undefined : '6 6'}
        className={animated && i % 2 === 1 ? 'animate-topo-drift' : undefined}
      />
    ))}
    {[0, 1, 2].map((i) => (
      <path
        key={`path-${i}`}
        d={`M -20 ${380 + i * 70} C 180 ${330 + i * 70}, 380 ${450 + i * 70}, 620 ${390 + i * 70} S 860 ${360 + i * 70}, 900 ${400 + i * 70}`}
        stroke={stroke}
        strokeOpacity={0.14}
        strokeWidth="1"
        strokeDasharray="4 7"
        className={animated ? 'animate-topo-drift' : undefined}
      />
    ))}
  </svg>
);
