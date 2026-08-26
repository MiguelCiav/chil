import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/Button';
import {
  WalkthroughOverlay,
  useWalkthrough,
  WalkthroughStep
} from '../../../components/walkthrough';
import { useAuth } from '../../auth';
import {
  RecognitionType,
  CertificateTemplate,
  RecognitionFieldConfig,
  RecognitionFieldKey,
  AVAILABLE_TEMPLATE_FIELDS,
  DEFAULT_CERTIFICATE_TEMPLATE
} from '../types';
import {
  getRecognitionTypeById,
  saveCertificateTemplate,
  processBackgroundImageFile
} from '../api';
import { useCanvasScale, useCanvasDrag } from '../hooks';
import { DesignerHeader, DesignerCanvas, DesignerSidebar } from './designer';

const CERTIFICATE_DESIGNER_TOUR_STEPS: WalkthroughStep[] = [
  {
    id: 'designer-header',
    targetSelector: '[data-walkthrough="designer-header"]',
    title: 'Diseñador Visual de Plantillas',
    content:
      'Configura la plantilla gráfica oficial para este reconocimiento. Los cambios que realices aquí se aplicarán a todos los diplomas generados a partir de este tipo.',
    placement: 'bottom'
  },
  {
    id: 'designer-canvas',
    targetSelector: '[data-walkthrough="designer-canvas"]',
    title: 'Lienzo del Diploma (Canvas 1:1)',
    content:
      'Este es el lienzo interactivo de tu diploma. Los campos posicionados aquí se estamparán en el PDF con exacta fidelidad de tamaño, posición y proporciones físicas milimétricas.',
    placement: 'right'
  },
  {
    id: 'designer-background-btn',
    targetSelector: '[data-walkthrough="designer-background-btn"]',
    title: 'Cargar Imagen de Fondo',
    content:
      'Sube la imagen del diploma o certificado en formato PNG, JPEG o WebP. El editor adaptará automáticamente las dimensiones y orientación física sin distorsión.',
    placement: 'bottom'
  },
  {
    id: 'designer-sidebar',
    targetSelector: '[data-walkthrough="designer-sidebar"]',
    title: 'Paleta de Variables y Estilo',
    content:
      'Haz clic en cualquier campo dinámico (Nombre, Cédula, Unidad, Código REC, etc.) para agregarlo al lienzo. Arrástralo libremente con el mouse hasta su ubicación deseada.',
    placement: 'left'
  },
  {
    id: 'designer-mode-switch',
    targetSelector: '[data-walkthrough="designer-mode-switch"]',
    title: 'Vista Previa con Datos Scout',
    content:
      'Usa el modo vista previa (icono del ojo) para previsualizar el diploma con datos de prueba realistas antes de guardar.',
    placement: 'bottom'
  },
  {
    id: 'designer-save-btn',
    targetSelector: '[data-walkthrough="designer-save-btn"]',
    title: 'Guardar Plantilla Oficial',
    content:
      'Una vez satisfecho con el diseño, haz clic en \'Guardar Plantilla\' para almacenar las coordenadas y estilos en la nube de forma segura.',
    placement: 'bottom'
  }
];

export const CertificateDesigner: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    isOpen: isTourOpen,
    currentStep: tourCurrentStep,
    currentStepIndex,
    totalSteps,
    targetRect,
    startTour,
    nextStep,
    prevStep,
    skipTour
  } = useWalkthrough({
    tourId: 'certificate-designer-tour',
    steps: CERTIFICATE_DESIGNER_TOUR_STEPS,
    autoStart: true,
    userId: user?.uid
  });

  const [recognition, setRecognition] = useState<RecognitionType | null>(null);
  const [template, setTemplate] = useState<CertificateTemplate>(DEFAULT_CERTIFICATE_TEMPLATE);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'palette' | 'properties' | 'format'>('palette');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploadingBg, setIsUploadingBg] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  const { canvasRef, fontScale, normalizedDimensions } = useCanvasScale(template);

  const { handlePointerDown, handlePointerMove, handlePointerUp } = useCanvasDrag({
    canvasRef,
    fields: template.fields,
    isPreviewMode,
    onUpdateFieldCoordinates: (fieldId, x, y) => {
      setTemplate((prev) => ({
        ...prev,
        fields: prev.fields.map((f) => (f.id === fieldId ? { ...f, x, y } : f))
      }));
    },
    onSelectField: (fieldId) => {
      setSelectedFieldId(fieldId);
      setActiveSidebarTab('properties');
    }
  });

  // Fetch recognition and existing template
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!id) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const item = await getRecognitionTypeById(id);
        if (isMounted) {
          if (item) {
            setRecognition(item);
            if (item.template && Array.isArray(item.template.fields)) {
              setTemplate({
                ...item.template,
                page_width: item.template.page_width || 297,
                page_height: item.template.page_height || 210,
                aspect_ratio:
                  item.template.aspect_ratio ||
                  (item.template.page_width && item.template.page_height
                    ? item.template.page_width / item.template.page_height
                    : 297 / 210),
                orientation: item.template.orientation || 'landscape'
              });
              if (item.template.fields.length > 0) {
                setSelectedFieldId(item.template.fields[0].id);
              }
            } else {
              // Initialize default template with standard fields
              const initialFields: RecognitionFieldConfig[] = AVAILABLE_TEMPLATE_FIELDS.map((def) => ({
                id: `field-${def.field_key}`,
                field_key: def.field_key,
                label: def.label,
                x: def.default_x,
                y: def.default_y,
                font_family: def.default_font_family,
                font_size: def.default_font_size,
                font_weight: def.default_font_weight,
                color: def.default_color,
                align: def.default_align
              }));
              setTemplate({
                background_url: '',
                page_width: 297,
                page_height: 210,
                aspect_ratio: 297 / 210,
                orientation: 'landscape',
                fields: initialFields
              });
              if (initialFields.length > 0) {
                setSelectedFieldId(initialFields[0].id);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error loading recognition:', err);
        showNotification('Error al cargar la información del reconocimiento.', 'error');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [id, showNotification]);

  const selectedField = template.fields.find((f) => f.id === selectedFieldId) || null;

  const handleAddField = (fieldKey: RecognitionFieldKey) => {
    const def = AVAILABLE_TEMPLATE_FIELDS.find((d) => d.field_key === fieldKey);
    if (!def) return;

    const existing = template.fields.find((f) => f.field_key === fieldKey);
    if (existing) {
      setSelectedFieldId(existing.id);
      setActiveSidebarTab('properties');
      return;
    }

    const newField: RecognitionFieldConfig = {
      id: `field-${fieldKey}`,
      field_key: fieldKey,
      label: def.label,
      x: def.default_x,
      y: def.default_y,
      font_family: def.default_font_family,
      font_size: def.default_font_size,
      font_weight: def.default_font_weight,
      color: def.default_color,
      align: def.default_align
    };

    setTemplate((prev) => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
    setSelectedFieldId(newField.id);
    setActiveSidebarTab('properties');
    showNotification(`Campo "${def.label}" añadido a la plantilla.`);
  };

  const handleRemoveField = (fieldId: string) => {
    const fieldToRemove = template.fields.find((f) => f.id === fieldId);
    setTemplate((prev) => ({
      ...prev,
      fields: prev.fields.filter((f) => f.id !== fieldId)
    }));
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
    if (fieldToRemove) {
      showNotification(`Campo "${fieldToRemove.label}" eliminado.`);
    }
  };

  const handleAddAllFields = () => {
    const currentKeys = new Set(template.fields.map((f) => f.field_key));
    const toAdd: RecognitionFieldConfig[] = AVAILABLE_TEMPLATE_FIELDS.filter(
      (def) => !currentKeys.has(def.field_key)
    ).map((def) => ({
      id: `field-${def.field_key}`,
      field_key: def.field_key,
      label: def.label,
      x: def.default_x,
      y: def.default_y,
      font_family: def.default_font_family,
      font_size: def.default_font_size,
      font_weight: def.default_font_weight,
      color: def.default_color,
      align: def.default_align
    }));

    if (toAdd.length === 0) return;

    setTemplate((prev) => ({
      ...prev,
      fields: [...prev.fields, ...toAdd]
    }));
    if (toAdd.length > 0) {
      setSelectedFieldId(toAdd[0].id);
      setActiveSidebarTab('properties');
    }
    showNotification(`Se añadieron ${toAdd.length} campos a la plantilla.`);
  };

  const handleResetFields = () => {
    const defaultFields: RecognitionFieldConfig[] = AVAILABLE_TEMPLATE_FIELDS.map((def) => ({
      id: `field-${def.field_key}`,
      field_key: def.field_key,
      label: def.label,
      x: def.default_x,
      y: def.default_y,
      font_family: def.default_font_family,
      font_size: def.default_font_size,
      font_weight: def.default_font_weight,
      color: def.default_color,
      align: def.default_align
    }));

    setTemplate((prev) => ({
      ...prev,
      fields: defaultFields
    }));
    if (defaultFields.length > 0) {
      setSelectedFieldId(defaultFields[0].id);
      setActiveSidebarTab('properties');
    }
    showNotification('Campos restablecidos a las posiciones estándar.');
  };

  const updateSelectedField = (patch: Partial<RecognitionFieldConfig>) => {
    if (!selectedFieldId) return;
    setTemplate((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === selectedFieldId ? { ...f, ...patch } : f))
    }));
  };

  const handleBackgroundUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingBg(true);
    try {
      const result = await processBackgroundImageFile(file);
      const background_url = typeof result === 'string' ? result : result.dataUrl;
      const page_width = typeof result === 'string' ? 297 : result.width;
      const page_height = typeof result === 'string' ? 210 : result.height;
      const aspect_ratio =
        typeof result === 'string' ? Math.round((297 / 210) * 1000) / 1000 : result.aspectRatio;
      const orientation = typeof result === 'string' ? 'landscape' : result.orientation;

      setTemplate((prev) => ({
        ...prev,
        background_url,
        page_width,
        page_height,
        aspect_ratio,
        orientation
      }));
      showNotification('Imagen de fondo cargada y optimizada exitosamente.');
    } catch (err) {
      console.error('Error uploading background image:', err);
      showNotification('Error al procesar la imagen de fondo.', 'error');
    } finally {
      setIsUploadingBg(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveBackground = () => {
    setTemplate((prev) => ({
      ...prev,
      background_url: '',
      page_width: 297,
      page_height: 210,
      aspect_ratio: 297 / 210,
      orientation: 'landscape'
    }));
    showNotification('Fondo personalizado eliminado.');
  };

  const handleSaveTemplate = async () => {
    if (!recognition) return;
    setIsSaving(true);
    try {
      await saveCertificateTemplate(recognition.id, template);
      showNotification('Plantilla de certificado guardada exitosamente.');
    } catch (err) {
      console.error('Error saving template:', err);
      showNotification('Error al guardar la plantilla en el servidor.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto py-12 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-neutral/70">Cargando diseñador de plantilla...</p>
      </div>
    );
  }

  if (!recognition) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-neutral">Reconocimiento no encontrado</h2>
        <p className="text-sm text-neutral/60">
          El tipo de reconocimiento solicitado no existe o fue eliminado.
        </p>
        <Button
          type="button"
          variant="primary"
          onClick={() => navigate('/reconocimientos')}
          icon={<ArrowLeft size={16} />}
        >
          Volver al Catálogo
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-5 font-sans py-2 pb-12 px-2 sm:px-4">
      {/* Toast Alert */}
      {toast && (
        <div
          role="alert"
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl border animate-fade-in ${
            toast.type === 'error'
              ? 'bg-red-900 text-white border-red-700'
              : 'bg-neutral text-white border-primary/20'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
          )}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Hidden File Input for Background Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleBackgroundUpload}
        accept="image/png,image/jpeg,image/webp,application/pdf"
        className="hidden"
        aria-label="Subir imagen de fondo"
      />

      {/* Top Header Bar */}
      <DesignerHeader
        recognitionName={recognition.name}
        isPreviewMode={isPreviewMode}
        isSaving={isSaving}
        isUploadingBg={isUploadingBg}
        hasBackground={Boolean(template.background_url)}
        onTogglePreview={setIsPreviewMode}
        onUploadClick={() => fileInputRef.current?.click()}
        onSave={handleSaveTemplate}
        onBack={() => navigate('/reconocimientos')}
        onStartTour={startTour}
      />

      {/* Main Ergonomic 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Large Spacious Canvas Area */}
        <DesignerCanvas
          canvasRef={canvasRef}
          template={template}
          selectedFieldId={selectedFieldId}
          isPreviewMode={isPreviewMode}
          fontScale={fontScale}
          recognitionName={recognition.name}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerDownField={handlePointerDown}
          onSelectField={(fieldId) => {
            setSelectedFieldId(fieldId);
            setActiveSidebarTab('properties');
          }}
        />

        {/* RIGHT COLUMN: Control Panel Sidebar */}
        <DesignerSidebar
          activeTab={activeSidebarTab}
          onTabChange={setActiveSidebarTab}
          template={template}
          selectedField={selectedField}
          normalizedDimensions={normalizedDimensions}
          isUploadingBg={isUploadingBg}
          onAddField={handleAddField}
          onRemoveField={handleRemoveField}
          onAddAllFields={handleAddAllFields}
          onResetFields={handleResetFields}
          onSelectField={setSelectedFieldId}
          onUpdateField={updateSelectedField}
          onUploadBgClick={() => fileInputRef.current?.click()}
          onRemoveBg={handleRemoveBackground}
        />
      </div>

      {/* Interactive Feature Walkthrough */}
      <WalkthroughOverlay
        isOpen={isTourOpen}
        currentStep={tourCurrentStep}
        currentStepIndex={currentStepIndex}
        totalSteps={totalSteps}
        targetRect={targetRect}
        onNext={nextStep}
        onPrev={prevStep}
        onSkip={skipTour}
      />
    </div>
  );
};

export default CertificateDesigner;
