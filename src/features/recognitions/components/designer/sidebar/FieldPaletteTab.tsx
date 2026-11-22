import React from 'react';
import { Palette as PaletteIcon, Plus, X, Sparkles, RotateCcw } from 'lucide-react';
import { Card, CardHeader, CardBody, Button } from '../../../../../components';
import {
  RecognitionFieldKey,
  RecognitionFieldConfig,
  AVAILABLE_TEMPLATE_FIELDS
} from '../../../types';
import { FIELD_ICONS } from '../designerUtils';

export interface FieldPaletteTabProps {
  fields: RecognitionFieldConfig[];
  selectedFieldId: string | null;
  onAddField: (key: RecognitionFieldKey) => void;
  onSelectField: (fieldId: string) => void;
  onRemoveField: (fieldId: string) => void;
  onAddAllFields: () => void;
  onResetFields: () => void;
}

function getFieldItemClassName(isSelected: boolean, isPlaced: boolean): string {
  if (isSelected) {
    return 'bg-primary/10 border-primary text-primary font-bold';
  }
  if (isPlaced) {
    return 'bg-gray-50 border-primary/20 text-neutral/80 hover:bg-gray-100';
  }
  return 'bg-white border-dashed border-gray-300 text-neutral/75 hover:border-primary/40 hover:bg-primary/5';
}

function renderFieldPaletteAction(
  isPlaced: boolean,
  placedFieldId: string | undefined,
  label: string,
  onRemoveField: (fieldId: string) => void,
  onAddField: () => void
) {
  if (isPlaced && placedFieldId) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs bg-green-100 text-green-700 font-semibold px-1.5 py-0.5 rounded">
          En plantilla
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemoveField(placedFieldId);
          }}
          className="p-1 text-neutral/75 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
          title="Quitar campo"
          aria-label={`Eliminar campo ${label}`}
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onAddField}
      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs transition-colors"
      aria-label={`Añadir ${label}`}
    >
      <Plus className="w-3 h-3" />
      <span>Añadir</span>
    </button>
  );
}

export const FieldPaletteTab: React.FC<FieldPaletteTabProps> = ({
  fields,
  selectedFieldId,
  onAddField,
  onSelectField,
  onRemoveField,
  onAddAllFields,
  onResetFields
}) => {
  return (
    <Card>
      <CardHeader className="py-3 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PaletteIcon className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-neutral">Paleta de Campos</h2>
        </div>
        <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
          {fields.length} / {AVAILABLE_TEMPLATE_FIELDS.length}
        </span>
      </CardHeader>
      <CardBody className="p-3 space-y-2">
        <p className="text-xs text-neutral/75 px-1 mb-2">
          Haga clic para añadir campos o seleccionarlos en el certificado.
        </p>

        <div className="space-y-1.5">
          {AVAILABLE_TEMPLATE_FIELDS.map((def) => {
            const placedField = fields.find((f) => f.field_key === def.field_key);
            const isPlaced = placedField !== undefined;
            const isSelected = placedField?.id === selectedFieldId;

            return (
              <div
                key={def.field_key}
                className={`flex items-center justify-between p-2 rounded-xl text-xs transition-all border ${getFieldItemClassName(
                  isSelected,
                  isPlaced
                )}`}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (placedField) {
                      onSelectField(placedField.id);
                    } else {
                      onAddField(def.field_key);
                    }
                  }}
                  className="flex items-center gap-2 flex-1 text-left font-medium overflow-hidden"
                >
                  <span className="text-primary flex-shrink-0">
                    {FIELD_ICONS[def.field_key]}
                  </span>
                  <span className="truncate">{def.label}</span>
                </button>

                {renderFieldPaletteAction(
                  isPlaced,
                  placedField?.id,
                  def.label,
                  onRemoveField,
                  () => onAddField(def.field_key)
                )}
              </div>
            );
          })}
        </div>

        {/* Quick Actions in Palette */}
        <div className="pt-3 border-t border-gray-100 space-y-1.5">
          {fields.length < AVAILABLE_TEMPLATE_FIELDS.length && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              fullWidth
              onClick={onAddAllFields}
              icon={<Sparkles className="w-3.5 h-3.5" />}
              className="text-primary hover:bg-primary/5"
            >
              Añadir todos los campos
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            fullWidth
            onClick={onResetFields}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            className="text-neutral/75 hover:text-neutral hover:bg-gray-100"
          >
            Restablecer posiciones
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};
