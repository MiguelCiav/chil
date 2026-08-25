import React from 'react';
import { Award, Move } from 'lucide-react';
import { CertificateTemplate } from '../../types';
import { DraggableField } from './DraggableField';
import { CanvasFormatBar } from './CanvasFormatBar';
import { getFormatBadgeText, getFieldDisplayText } from './designerUtils';

export interface DesignerCanvasProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  template: CertificateTemplate;
  selectedFieldId: string | null;
  isPreviewMode: boolean;
  fontScale: number;
  recognitionName?: string;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerDownField: (e: React.PointerEvent<HTMLDivElement>, fieldId: string) => void;
  onSelectField: (fieldId: string) => void;
}

export const DesignerCanvas: React.FC<DesignerCanvasProps> = ({
  canvasRef,
  template,
  selectedFieldId,
  isPreviewMode,
  fontScale,
  recognitionName,
  onPointerMove,
  onPointerUp,
  onPointerDownField,
  onSelectField
}) => {
  const formatBadgeText = getFormatBadgeText(
    template.page_width || 297,
    template.page_height || 210,
    template.aspect_ratio,
    Boolean(template.background_url)
  );

  const canvasAspectRatioStyle = template.aspect_ratio
    ? `${template.aspect_ratio}`
    : `${template.page_width || 297} / ${template.page_height || 210}`;

  return (
    <div className="lg:col-span-8 xl:col-span-8 2xl:col-span-9 space-y-4">
      {/* Large Interactive Canvas Viewport */}
      <div className="bg-gray-100/80 border border-gray-200/80 rounded-2xl p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[480px]">
        {/* The Dynamic Canvas Box */}
        <div
          ref={canvasRef}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="relative w-full max-w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-300 select-none transition-all"
          style={{
            aspectRatio: canvasAspectRatioStyle,
            boxShadow: '0 20px 45px -12px rgba(0, 0, 0, 0.18)'
          }}
        >
          {/* Background Layer: Custom Image or Scout Decorative Graphic */}
          {template.background_url ? (
            <img
              src={template.background_url}
              alt="Fondo del Certificado"
              className="absolute inset-0 w-full h-full object-fill pointer-events-none"
            />
          ) : (
            /* Default Scout Certificate Graphic */
            <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-amber-50/70 via-white to-amber-50/40 p-5 pointer-events-none flex flex-col justify-between">
              <div className="w-full h-full border-4 border-double border-primary/30 rounded-xl p-4 flex flex-col justify-between relative">
                {/* Decorative Scout Corners */}
                <div className="absolute -top-2 -left-2 w-5 h-5 border-t-2 border-l-2 border-primary" />
                <div className="absolute -top-2 -right-2 w-5 h-5 border-t-2 border-r-2 border-primary" />
                <div className="absolute -bottom-2 -left-2 w-5 h-5 border-b-2 border-l-2 border-primary" />
                <div className="absolute -bottom-2 -right-2 w-5 h-5 border-b-2 border-r-2 border-primary" />

                {/* Header Title Placeholder */}
                <div className="text-center pt-2">
                  <span className="text-xs uppercase tracking-widest font-extrabold text-primary/50 font-serif">
                    Asociación de Scouts de Venezuela
                  </span>
                  <div className="text-sm uppercase tracking-wider font-semibold text-neutral/40">
                    Certificado Oficial de Reconocimiento
                  </div>
                </div>

                {/* Center Watermark */}
                <div className="flex flex-col items-center justify-center opacity-10 py-6">
                  <Award className="w-24 h-24 text-primary" />
                </div>

                {/* Footer Decorative Line */}
                <div className="flex justify-between items-center text-[10px] text-neutral/40 font-mono pb-1 px-4 border-t border-primary/10">
                  <span>Fondo Estándar Scout</span>
                  <span>Formato 297 × 210 mm</span>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Draggable Fields Layer */}
          {template.fields.map((field) => {
            const isSelected = !isPreviewMode && selectedFieldId === field.id;
            const displayText = getFieldDisplayText(field, isPreviewMode, recognitionName);

            return (
              <DraggableField
                key={field.id}
                field={field}
                isSelected={isSelected}
                isPreviewMode={isPreviewMode}
                fontScale={fontScale}
                displayText={displayText}
                onPointerDown={onPointerDownField}
                onSelect={onSelectField}
              />
            );
          })}
        </div>

        {/* Canvas Bottom Helper */}
        <div className="flex flex-wrap items-center justify-between w-full text-xs text-neutral/50 px-2 pt-4 gap-2">
          <span className="flex items-center gap-1.5">
            <Move className="w-3.5 h-3.5 text-primary" />
            <span>Arrastre los campos para ajustar sus coordenadas libremente</span>
          </span>
          <span className="font-mono text-[11px]">{formatBadgeText}</span>
        </div>
      </div>

      {/* Format Info Bar directly below canvas */}
      <CanvasFormatBar
        formatBadgeText={formatBadgeText}
        orientation={template.orientation}
        fieldCount={template.fields.length}
      />
    </div>
  );
};
