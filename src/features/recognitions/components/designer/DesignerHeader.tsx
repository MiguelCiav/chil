import React from 'react';
import { ArrowLeft, Save, Upload, Eye, Edit3 } from 'lucide-react';
import { Button } from '../../../../components/Button';
import { WalkthroughHelpButton } from '../../../../components/walkthrough';

export interface DesignerHeaderProps {
  recognitionName: string;
  isPreviewMode: boolean;
  isSaving: boolean;
  isUploadingBg: boolean;
  hasBackground: boolean;
  onTogglePreview: (preview: boolean) => void;
  onUploadClick: () => void;
  onSave: () => void;
  onBack: () => void;
  onStartTour?: () => void;
}

function getUploadButtonText(isUploadingBg: boolean, hasBackground: boolean): string {
  if (isUploadingBg) return 'Subiendo...';
  if (hasBackground) return 'Cambiar Fondo';
  return 'Subir Fondo';
}

export const DesignerHeader: React.FC<DesignerHeaderProps> = ({
  recognitionName,
  isPreviewMode,
  isSaving,
  isUploadingBg,
  hasBackground,
  onTogglePreview,
  onUploadClick,
  onSave,
  onBack,
  onStartTour
}) => {
  return (
    <div
      data-walkthrough="designer-header"
      className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-primary/20 rounded-2xl p-4 sm:p-5 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onBack}
          icon={<ArrowLeft size={16} />}
          className="flex-shrink-0"
          aria-label="Volver al catálogo"
        >
          Volver
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-neutral tracking-tight">
              {recognitionName}
            </h1>
            {onStartTour && <WalkthroughHelpButton onClick={onStartTour} />}
          </div>
        </div>
      </div>

      {/* Global Action Controls */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Mode Switcher */}
        <div
          data-walkthrough="designer-mode-switch"
          className="inline-flex rounded-xl p-1 bg-gray-100 border border-gray-200"
        >
          <button
            type="button"
            onClick={() => onTogglePreview(false)}
            title="Modo Edición"
            aria-label="Modo Edición"
            className={`p-2 rounded-lg text-xs font-semibold transition-all ${
              !isPreviewMode
                ? 'bg-white text-neutral shadow-sm font-bold'
                : 'text-neutral/60 hover:text-neutral'
            }`}
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onTogglePreview(true)}
            title="Vista previa con datos de prueba"
            aria-label="Vista previa con datos de prueba"
            className={`p-2 rounded-lg text-xs font-semibold transition-all ${
              isPreviewMode
                ? 'bg-white text-primary shadow-sm font-bold'
                : 'text-neutral/60 hover:text-neutral'
            }`}
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>

        {/* Background Upload */}
        <Button
          data-walkthrough="designer-background-btn"
          type="button"
          variant="outline"
          size="sm"
          onClick={onUploadClick}
          disabled={isUploadingBg}
          icon={<Upload size={15} />}
        >
          {getUploadButtonText(isUploadingBg, hasBackground)}
        </Button>

        {/* Save Template Primary Button */}
        <Button
          data-walkthrough="designer-save-btn"
          type="button"
          variant="primary"
          size="sm"
          onClick={onSave}
          disabled={isSaving}
          icon={<Save size={15} />}
          className="shadow-sm"
        >
          {isSaving ? 'Guardando...' : 'Guardar Plantilla'}
        </Button>
      </div>
    </div>
  );
};

