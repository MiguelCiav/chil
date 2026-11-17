import React from 'react';
import { ArrowLeft, Save, Upload, Eye, Edit3, Undo2, Redo2, Magnet } from 'lucide-react';
import { Button } from '../../../../components/Button';
import { WalkthroughHelpButton } from '../../../../components/walkthrough';

export interface DesignerHeaderProps {
  recognitionName: string;
  isPreviewMode: boolean;
  isSaving: boolean;
  isUploadingBg: boolean;
  hasBackground: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  isSnapEnabled?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onToggleSnap?: (enabled: boolean) => void;
  onTogglePreview: (preview: boolean) => void;
  onUploadClick: () => void;
  onSave: () => void;
  onBack: () => void;
  onStartTour?: () => void;
}

function getUploadButtonText(isUploadingBg: boolean, hasBackground: boolean): string {
  if (isUploadingBg) return 'Procesando...';
  if (hasBackground) return 'Cambiar Fondo';
  return 'Subir Fondo';
}

export const DesignerHeader: React.FC<DesignerHeaderProps> = ({
  recognitionName,
  isPreviewMode,
  isSaving,
  isUploadingBg,
  hasBackground,
  canUndo = false,
  canRedo = false,
  isSnapEnabled = true,
  onUndo,
  onRedo,
  onToggleSnap,
  onTogglePreview,
  onUploadClick,
  onSave,
  onBack,
  onStartTour
}) => {
  return (
    <div
      data-walkthrough="designer-header"
      className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-primary/20 rounded-2xl p-4 sm:p-5"
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
        {/* Undo / Redo Toolbar Controls */}
        <div className="inline-flex rounded-xl p-1 bg-gray-100 border border-gray-200">
          <button
            type="button"
            onClick={() => onUndo?.()}
            disabled={!canUndo}
            title="Deshacer (Ctrl+Z)"
            aria-label="Deshacer"
            className="p-2 rounded-lg text-xs font-semibold text-neutral hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onRedo?.()}
            disabled={!canRedo}
            title="Rehacer (Ctrl+Y)"
            aria-label="Rehacer"
            className="p-2 rounded-lg text-xs font-semibold text-neutral hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Snap-to-Guides Toggle */}
        {onToggleSnap && (
          <button
            type="button"
            onClick={() => onToggleSnap(!isSnapEnabled)}
            disabled={isPreviewMode}
            aria-label="Ajuste automático a guías"
            aria-pressed={isSnapEnabled}
            title={
              isSnapEnabled
                ? 'Ajuste a guías activo (mantén Alt para mover libremente)'
                : 'Ajuste a guías desactivado (movimiento libre)'
            }
            className={`inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              isSnapEnabled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-gray-100 text-neutral/70 border-gray-200 hover:bg-gray-200/70'
            }`}
          >
            <Magnet className="w-4 h-4" />
            <span className="hidden sm:inline">Guías</span>
          </button>
        )}

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
                ? 'bg-white text-neutral font-bold'
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
                ? 'bg-white text-primary font-bold'
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
        >
          {isSaving ? 'Guardando...' : 'Guardar Plantilla'}
        </Button>
      </div>
    </div>
  );
};

