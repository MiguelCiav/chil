import React from 'react';
import {
  Type,
  X,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  Move
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../../../../components/Card';
import { RecognitionFieldConfig } from '../../../types';
import { FIELD_ICONS, PRESET_COLORS } from '../designerUtils';

export interface FieldPropertiesTabProps {
  selectedField: RecognitionFieldConfig | null;
  onClose: () => void;
  onUpdateField: (patch: Partial<RecognitionFieldConfig>) => void;
  onRemoveField: (fieldId: string) => void;
}

export const FieldPropertiesTab: React.FC<FieldPropertiesTabProps> = ({
  selectedField,
  onClose,
  onUpdateField,
  onRemoveField
}) => {
  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader className="py-3 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-neutral">Propiedades del Campo</h2>
        </div>
        {selectedField && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-neutral/40 hover:text-neutral rounded transition-colors"
            aria-label="Cerrar propiedades"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </CardHeader>
      <CardBody className="p-4">
        {selectedField ? (
          <div className="space-y-4">
            {/* Field Header */}
            <div className="flex items-center justify-between p-2.5 bg-primary/5 rounded-xl border border-primary/10">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-primary text-white flex items-center justify-center">
                  {FIELD_ICONS[selectedField.field_key]}
                </div>
                <span className="font-bold text-xs text-neutral">
                  {selectedField.label}
                </span>
              </div>
              <span className="text-[10px] font-mono text-neutral/50">
                {selectedField.x}%, {selectedField.y}%
              </span>
            </div>

            {/* Typography: Font Family */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral">
                Familia Tipográfica
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { key: 'helvetica', label: 'Helvetica' },
                  { key: 'times', label: 'Times' },
                  { key: 'courier', label: 'Courier' }
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() =>
                      onUpdateField({
                        font_family: item.key as RecognitionFieldConfig['font_family']
                      })
                    }
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-colors ${
                      selectedField.font_family === item.key
                        ? 'bg-primary text-white border-primary font-bold'
                        : 'bg-white text-neutral/80 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="font-size-slider" className="font-semibold text-neutral">
                  Tamaño de Fuente
                </label>
                <span className="font-bold text-primary font-mono">
                  {selectedField.font_size} pt
                </span>
              </div>
              <input
                id="font-size-slider"
                type="range"
                min={10}
                max={48}
                value={selectedField.font_size}
                onChange={(e) =>
                  onUpdateField({ font_size: parseInt(e.target.value, 10) })
                }
                className="w-full accent-primary cursor-pointer"
                aria-label="Tamaño de fuente"
              />
            </div>

            {/* Font Weight / Style */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral">Estilo de Texto</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { key: 'normal', label: 'Normal' },
                  { key: 'bold', label: 'Negrita' },
                  { key: 'italic', label: 'Cursiva' }
                ].map((style) => (
                  <button
                    key={style.key}
                    type="button"
                    onClick={() =>
                      onUpdateField({
                        font_weight: style.key as RecognitionFieldConfig['font_weight']
                      })
                    }
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-colors ${
                      selectedField.font_weight === style.key
                        ? 'bg-primary text-white border-primary font-bold'
                        : 'bg-white text-neutral/80 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Color */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-neutral">Color de Texto</label>
                <span className="font-mono text-xs text-neutral/60">
                  {selectedField.color}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 flex-1">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => onUpdateField({ color: c.value })}
                      title={c.label}
                      aria-label={`Color ${c.label}`}
                      className={`w-6 h-6 rounded-full border transition-transform ${
                        selectedField.color.toLowerCase() === c.value.toLowerCase()
                          ? 'scale-125 ring-2 ring-primary ring-offset-1 border-white'
                          : 'border-gray-300 hover:scale-110'
                      }`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={selectedField.color}
                  onChange={(e) => onUpdateField({ color: e.target.value })}
                  className="w-7 h-7 rounded border border-gray-300 p-0 cursor-pointer"
                  title="Personalizar color hexadecimal"
                  aria-label="Selector de color personalizado"
                />
              </div>
            </div>

            {/* Alignment */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral">Alineación</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { key: 'left', label: 'Izquierda', icon: <AlignLeft className="w-3.5 h-3.5" /> },
                  { key: 'center', label: 'Centro', icon: <AlignCenter className="w-3.5 h-3.5" /> },
                  { key: 'right', label: 'Derecha', icon: <AlignRight className="w-3.5 h-3.5" /> }
                ].map((align) => (
                  <button
                    key={align.key}
                    type="button"
                    onClick={() =>
                      onUpdateField({
                        align: align.key as RecognitionFieldConfig['align']
                      })
                    }
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-1 transition-colors ${
                      selectedField.align === align.key
                        ? 'bg-primary text-white border-primary font-bold'
                        : 'bg-white text-neutral/80 border-gray-200 hover:bg-gray-50'
                    }`}
                    aria-label={`Alineación ${align.label}`}
                  >
                    {align.icon}
                    <span className="hidden sm:inline">{align.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Coordinates X, Y Fine Tuning */}
            <div className="space-y-1.5 pt-2 border-t border-gray-100">
              <label className="text-xs font-semibold text-neutral">Posición (%)</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                  <span className="text-[11px] font-bold text-neutral/60 pl-1">X:</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={selectedField.x}
                    onChange={(e) =>
                      onUpdateField({
                        x: Math.max(0, Math.min(100, Number(e.target.value)))
                      })
                    }
                    className="w-full bg-transparent text-xs font-mono text-neutral focus:outline-none"
                    aria-label="Coordenada X"
                  />
                  <span className="text-[10px] text-neutral/40 pr-1">%</span>
                </div>
                <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                  <span className="text-[11px] font-bold text-neutral/60 pl-1">Y:</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={selectedField.y}
                    onChange={(e) =>
                      onUpdateField({
                        y: Math.max(0, Math.min(100, Number(e.target.value)))
                      })
                    }
                    className="w-full bg-transparent text-xs font-mono text-neutral focus:outline-none"
                    aria-label="Coordenada Y"
                  />
                  <span className="text-[10px] text-neutral/40 pr-1">%</span>
                </div>
              </div>
            </div>

            {/* Delete Field Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onRemoveField(selectedField.id)}
                className="w-full py-2 px-3 text-xs text-red-600 hover:bg-red-50 border border-red-200 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-colors"
                aria-label="Eliminar campo del certificado"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar del Certificado</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 px-2 space-y-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Move className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-neutral">
              Haz clic en un campo del certificado para editar su estilo
            </p>
            <p className="text-xs text-neutral/60">
              Seleccione un campo en el certificado o en la paleta para editar sus propiedades
              tipográficas y posición.
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
};
