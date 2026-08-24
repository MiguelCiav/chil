import React from 'react';
import { FileImage, Upload, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../../../../components/Card';
import { Button } from '../../../../../components/Button';
import { CertificateTemplate, AVAILABLE_TEMPLATE_FIELDS } from '../../../types';

export interface BackgroundFormatTabProps {
  template: CertificateTemplate;
  normalizedDimensions: {
    width: number;
    height: number;
    orientation: 'landscape' | 'portrait';
  };
  isUploadingBg: boolean;
  onUploadBgClick: () => void;
  onRemoveBg: () => void;
}

export const BackgroundFormatTab: React.FC<BackgroundFormatTabProps> = ({
  template,
  normalizedDimensions,
  isUploadingBg,
  onUploadBgClick,
  onRemoveBg
}) => {
  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader className="py-3 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileImage className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-neutral">Información de Formato y Fondo</h2>
        </div>
      </CardHeader>
      <CardBody className="p-3 space-y-3 text-xs">
        {/* Format Specifications Summary */}
        <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
          <div className="flex justify-between items-center text-neutral/70">
            <span className="font-medium">Dimensiones:</span>
            <span className="font-mono font-semibold text-neutral">
              {template.page_width} × {template.page_height}
            </span>
          </div>
          <div className="flex justify-between items-center text-neutral/70">
            <span className="font-medium">Dimensiones de Impresión:</span>
            <span className="font-mono font-semibold text-primary">
              {normalizedDimensions.width} × {normalizedDimensions.height} mm
            </span>
          </div>
          <div className="flex justify-between items-center text-neutral/70">
            <span className="font-medium">Relación de Aspecto:</span>
            <span className="font-mono font-semibold text-neutral">
              {(template.aspect_ratio || (template.page_width / template.page_height)).toFixed(3)}
            </span>
          </div>
          <div className="flex justify-between items-center text-neutral/70">
            <span className="font-medium">Orientación:</span>
            <span className="font-semibold text-neutral capitalize">
              {normalizedDimensions.orientation === 'portrait' ? 'Vertical' : 'Horizontal'}
            </span>
          </div>
          <div className="flex justify-between items-center text-neutral/70">
            <span className="font-medium">Campos Configurados:</span>
            <span className="font-semibold text-primary font-mono">
              {template.fields.length} / {AVAILABLE_TEMPLATE_FIELDS.length}
            </span>
          </div>
        </div>

        {/* Background Status & Actions */}
        {template.background_url ? (
          <div className="space-y-2">
            <div className="w-full h-24 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center relative group">
              <img
                src={template.background_url}
                alt="Miniatura de fondo"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                fullWidth
                onClick={onUploadBgClick}
                icon={<Upload size={14} />}
              >
                Cambiar
              </Button>
              <button
                type="button"
                onClick={onRemoveBg}
                className="py-1.5 px-3 text-xs text-red-600 hover:bg-red-50 border border-red-200 rounded-xl font-medium flex items-center justify-center gap-1 transition-colors flex-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Quitar</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-neutral/60">
            <p className="text-[11px]">
              Actualmente se usa el diseño predeterminado. Puede subir una plantilla gráfica
              personalizada en PNG, JPG o PDF para adaptar automáticamente el tamaño y las proporciones.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              fullWidth
              onClick={onUploadBgClick}
              disabled={isUploadingBg}
              icon={<Upload size={14} />}
            >
              {isUploadingBg ? 'Subiendo...' : 'Subir Fondo Personalizado'}
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
};
