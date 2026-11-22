import React, { useId } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, RefreshCw, AlertTriangle, UploadCloud } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Field,
  Select
} from '../../../../components';
import { RecognitionType } from '../../../recognitions';
import { step1DataLoadSchema, Step1DataLoadFormData } from './wizardSchema';
import { parseCedulasFromText } from './wizardHelpers';

export interface Step1DataLoadProps {
  recognitionTypes: RecognitionType[];
  loadingHierarchy?: boolean;
  isVerifying: boolean;
  verifyProgress: { current: number; total: number };
  onSubmitStep1: (data: Step1DataLoadFormData) => Promise<void>;
  initialComment?: string;
  initialRecognitionType?: string;
  initialCedulas?: string;
}

export const Step1DataLoad: React.FC<Step1DataLoadProps> = ({
  recognitionTypes = [],
  loadingHierarchy = false,
  isVerifying,
  verifyProgress,
  onSubmitStep1,
  initialComment = '',
  initialRecognitionType = '',
  initialCedulas = ''
}) => {
  const fileInputId = useId();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<Step1DataLoadFormData>({
    resolver: zodResolver(step1DataLoadSchema),
    mode: 'onChange',
    defaultValues: {
      comment: initialComment,
      recognitionType: initialRecognitionType,
      cedulas: initialCedulas
    }
  });

  const watchedCedulas = watch('cedulas') || '';
  const parsedCedulas = parseCedulasFromText(watchedCedulas);
  const parsedCount = parsedCedulas.length;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const existing = watchedCedulas.trim();
        const combined = existing ? `${existing}\n${content}` : content;
        setValue('cedulas', combined, { shouldValidate: true, shouldDirty: true });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div data-walkthrough="wizard-step-container" className="space-y-4">
      {/* Empty Recognition Types Alert Card */}
      {!loadingHierarchy && recognitionTypes.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-amber-900">
              No tienes tipos de reconocimientos registrados. Debes crear al menos un tipo de reconocimiento en el Catálogo antes de crear un nuevo lote.
            </p>
          </div>
          <Link
            to="/reconocimientos"
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-primary text-white hover:bg-primary/90 transition-colors flex-shrink-0"
          >
            Ir al Catálogo de Reconocimientos
          </Link>
        </div>
      )}

      <Card>
        <CardHeader className="bg-primary/5 border-b border-primary/10">
          <div>
            <h2 className="text-lg font-bold text-neutral">Carga de Datos del Lote</h2>
            <p className="text-xs text-neutral/75">
              Ingresa el tipo de reconocimiento y la lista de cédulas. La estructura geográfica y las unidades se auto-detectarán.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-primary/10 text-primary rounded-full shrink-0">
            Paso 1 de 2
          </span>
        </CardHeader>

        <CardBody className="space-y-6">
          <form onSubmit={handleSubmit(onSubmitStep1)} className="space-y-6">
            {/* Metadatos Generales */}
            <div className="grid md:grid-cols-2 gap-6">
              <Select
                id="field-recognition-type"
                label="Tipo de Reconocimiento *"
                aria-label="Tipo de Reconocimiento"
                disabled={isVerifying || loadingHierarchy}
                variant={errors.recognitionType ? 'error' : 'default'}
                errorText={errors.recognitionType?.message}
                {...register('recognitionType')}
              >
                <option value="">Seleccione un reconocimiento...</option>
                {recognitionTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.name}
                  </option>
                ))}
              </Select>

              <Field
                id="field-batch-comment"
                label="Título / Comentario del Lote (Opcional)"
                aria-label="Título o Comentario del Lote"
                placeholder="Ej. Reconocimientos de ENJ 2026"
                disabled={isVerifying}
                {...register('comment')}
              />
            </div>

            {/* Caja Única de Cédulas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="field-batch-cedulas"
                  className="block text-sm font-semibold text-neutral"
                >
                  Cédulas de Identidad *
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-neutral/10 text-neutral/75">
                    {parsedCount} {parsedCount === 1 ? 'cédula detectada' : 'cédulas detectadas'}
                  </span>
                  <label
                    htmlFor={fileInputId}
                    className="text-xs text-primary font-bold hover:underline cursor-pointer inline-flex items-center gap-1"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Importar archivo</span>
                    <input
                      id={fileInputId}
                      type="file"
                      accept=".csv,.txt"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isVerifying}
                    />
                  </label>
                </div>
              </div>

              <textarea
                id="field-batch-cedulas"
                {...register('cedulas')}
                aria-label="Cédulas de Identidad"
                rows={6}
                placeholder={`Pega aquí las cédulas una por línea o separadas por comas.\nEjemplos:\n12345678\n23456789\n34567890`}
                className="w-full rounded-field p-4 bg-primary/5 border border-primary/70 text-neutral text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                disabled={isVerifying}
              />
              {errors.cedulas && (
                <p role="alert" className="text-xs text-red-700 font-medium">
                  {errors.cedulas.message}
                </p>
              )}
            </div>

            {/* Indicador de Progreso en Vivo */}
            {isVerifying && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-2 animate-fade-in">
                <div className="flex justify-between items-center text-xs font-bold text-blue-900">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                    Consultando Sistema de Registro Impeesa...
                  </span>
                  <span>
                    {verifyProgress.current} de {verifyProgress.total}
                  </span>
                </div>
                <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300 rounded-full"
                    style={{
                      width: `${(verifyProgress.current / Math.max(1, verifyProgress.total)) * 100}%`
                    }}
                  />
                </div>
              </div>
            )}

            {/* Botón de Envío */}
            <div
              data-walkthrough="wizard-navigation-buttons"
              className="flex justify-end pt-4 border-t border-primary/10"
            >
              <Button
                type="submit"
                variant="primary"
                disabled={isVerifying || parsedCount === 0 || recognitionTypes.length === 0}
                icon={
                  isVerifying ? (
                    <RefreshCw className="animate-spin" size={18} />
                  ) : (
                    <ArrowRight size={18} />
                  )
                }
                iconPosition="right"
              >
                {isVerifying ? 'Verificando con Impeesa...' : 'Cargar y Verificar Miembros'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};
