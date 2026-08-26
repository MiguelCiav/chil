import React from 'react';
import { Palette as PaletteIcon, Type, FileImage } from 'lucide-react';
import {
  CertificateTemplate,
  RecognitionFieldConfig,
  RecognitionFieldKey
} from '../../../types';
import { FieldPaletteTab } from './FieldPaletteTab';
import { FieldPropertiesTab } from './FieldPropertiesTab';
import { BackgroundFormatTab } from './BackgroundFormatTab';

export interface DesignerSidebarProps {
  activeTab: 'palette' | 'properties' | 'format';
  onTabChange: (tab: 'palette' | 'properties' | 'format') => void;
  template: CertificateTemplate;
  selectedField: RecognitionFieldConfig | null;
  normalizedDimensions: {
    width: number;
    height: number;
    orientation: 'landscape' | 'portrait';
  };
  isUploadingBg: boolean;
  onAddField: (key: RecognitionFieldKey) => void;
  onRemoveField: (fieldId: string) => void;
  onAddAllFields: () => void;
  onResetFields: () => void;
  onSelectField: (fieldId: string | null) => void;
  onUpdateField: (patch: Partial<RecognitionFieldConfig>) => void;
  onUploadBgClick: () => void;
  onRemoveBg: () => void;
}

export const DesignerSidebar: React.FC<DesignerSidebarProps> = ({
  activeTab,
  onTabChange,
  template,
  selectedField,
  normalizedDimensions,
  isUploadingBg,
  onAddField,
  onRemoveField,
  onAddAllFields,
  onResetFields,
  onSelectField,
  onUpdateField,
  onUploadBgClick,
  onRemoveBg
}) => {
  return (
    <div data-walkthrough="designer-sidebar" className="lg:col-span-4 xl:col-span-4 2xl:col-span-3 space-y-4">
      {/* Quick Tab Switcher */}
      <div className="flex rounded-2xl p-1 bg-white border border-gray-200 shadow-sm">
        <button
          type="button"
          onClick={() => onTabChange('palette')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'palette'
              ? 'bg-primary text-white shadow-sm'
              : 'text-neutral/60 hover:text-neutral hover:bg-gray-50'
          }`}
        >
          <PaletteIcon className="w-3.5 h-3.5" />
          <span>Campos</span>
        </button>
        <button
          type="button"
          onClick={() => onTabChange('properties')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'properties'
              ? 'bg-primary text-white shadow-sm'
              : 'text-neutral/60 hover:text-neutral hover:bg-gray-50'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>Estilo</span>
        </button>
        <button
          type="button"
          onClick={() => onTabChange('format')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'format'
              ? 'bg-primary text-white shadow-sm'
              : 'text-neutral/60 hover:text-neutral hover:bg-gray-50'
          }`}
        >
          <FileImage className="w-3.5 h-3.5" />
          <span>Fondo</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'palette' && (
        <FieldPaletteTab
          fields={template.fields}
          selectedFieldId={selectedField?.id || null}
          onAddField={onAddField}
          onSelectField={(fieldId) => {
            onSelectField(fieldId);
            onTabChange('properties');
          }}
          onRemoveField={onRemoveField}
          onAddAllFields={onAddAllFields}
          onResetFields={onResetFields}
        />
      )}

      {activeTab === 'properties' && (
        <FieldPropertiesTab
          selectedField={selectedField}
          onClose={() => {
            onSelectField(null);
            onTabChange('palette');
          }}
          onUpdateField={onUpdateField}
          onRemoveField={onRemoveField}
        />
      )}

      {activeTab === 'format' && (
        <BackgroundFormatTab
          template={template}
          normalizedDimensions={normalizedDimensions}
          isUploadingBg={isUploadingBg}
          onUploadBgClick={onUploadBgClick}
          onRemoveBg={onRemoveBg}
        />
      )}
    </div>
  );
};
