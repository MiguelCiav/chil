import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Toast, ErrorAlert } from '../../../components';
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
  processBackgroundImageFile,
  ProcessedBackgroundResult
} from '../api';
import { useCanvasScale, useCanvasDrag } from '../hooks';
import {
  useDesignerReducer,
  buildDefaultField,
  buildDefaultTemplateFields,
  normalizeLoadedTemplate,
  getMissingTemplateFields
} from '../hooks/useDesignerReducer';
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

function extractBackgroundTemplatePatch(
  result: ProcessedBackgroundResult | string
): Partial<CertificateTemplate> {
  if (typeof result === 'string') {
    return {
      background_url: result,
      page_width: 297,
      page_height: 210,
      aspect_ratio: Math.round((297 / 210) * 1000) / 1000,
      orientation: 'landscape'
    };
  }

  return {
    background_url: result.dataUrl,
    page_width: result.width,
    page_height: result.height,
    aspect_ratio: result.aspectRatio,
    orientation: result.orientation
  };
}

export const CertificateDesigner: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [recognition, setRecognition] = useState<RecognitionType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
    autoStart: !isLoading && Boolean(recognition),
    userId: user?.uid
  });

  const {
    template,
    past,
    canUndo,
    canRedo,
    loadTemplate,
    addField,
    addFields,
    removeField,
    updateFieldProps,
    moveFieldCoordinates,
    moveFieldCoordinatesTransient,
    commitFieldMove,
    resetFields,
    setBackground,
    clearBackground,
    undo,
    redo
  } = useDesignerReducer(DEFAULT_CERTIFICATE_TEMPLATE);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [isSnapEnabled, setIsSnapEnabled] = useState<boolean>(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'palette' | 'properties' | 'format'>('palette');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploadingBg, setIsUploadingBg] = useState<boolean>(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'warning' | 'error';
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissNotification = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  }, []);

  const showNotification = useCallback(
    (
      message: string,
      type: 'success' | 'warning' | 'error' = 'success',
      options?: { persistent?: boolean }
    ) => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
      setToast({ message, type });
      if (!options?.persistent) {
        const durationMs = type === 'success' ? 4000 : 8000;
        toastTimerRef.current = setTimeout(() => {
          setToast(null);
          toastTimerRef.current = null;
        }, durationMs);
      }
    },
    []
  );

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const { canvasRef, fontScale, normalizedDimensions } = useCanvasScale(template);

  const handleSelectField = useCallback((fieldId: string) => {
    setSelectedFieldId(fieldId);
    setActiveSidebarTab('properties');
  }, []);

  const handleDeselectField = useCallback(() => {
    setSelectedFieldId(null);
  }, []);

  const {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    activeGuides,
    draggingFieldId
  } = useCanvasDrag({
    canvasRef,
    fields: template.fields,
    isPreviewMode,
    snapEnabled: isSnapEnabled,
    onUpdateFieldCoordinates: moveFieldCoordinatesTransient,
    onCommitFieldCoordinates: commitFieldMove,
    onSelectField: handleSelectField
  });

  const deleteFieldById = useCallback(
    (fieldId: string, includeUndoHint = false) => {
      const fieldToRemove = template.fields.find((f) => f.id === fieldId);
      removeField(fieldId);
      if (selectedFieldId === fieldId) {
        setSelectedFieldId(null);
      }
      if (fieldToRemove) {
        const suffix = includeUndoHint ? ' (Ctrl+Z para deshacer)' : '';
        showNotification(`Campo "${fieldToRemove.label}" eliminado${suffix}.`);
      }
    },
    [template.fields, removeField, selectedFieldId, showNotification]
  );

  const handleRemoveField = useCallback(
    (fieldId: string) => {
      deleteFieldById(fieldId, false);
    },
    [deleteFieldById]
  );

  const handleUndo = useCallback(() => {
    const previousFields = past.at(-1)?.fields ?? [];
    const restoredFields = previousFields.filter(
      (prevField) => !template.fields.some((curField) => curField.id === prevField.id)
    );
    undo();
    if (restoredFields.length > 0) {
      setSelectedFieldId(restoredFields[0].id);
      setActiveSidebarTab('properties');
    }
  }, [past, template.fields, undo]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditableTarget =
        Boolean(
          target?.closest?.('input, textarea, select, [contenteditable="true"], [contenteditable=""]')
        ) || Boolean(target?.isContentEditable);

      if (isEditableTarget) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (
          selectedFieldId === null ||
          isPreviewMode ||
          isTourOpen ||
          draggingFieldId !== null ||
          e.ctrlKey ||
          e.metaKey ||
          e.altKey
        ) {
          return;
        }
        e.preventDefault();
        deleteFieldById(selectedFieldId, true);
        return;
      }

      if (!(e.ctrlKey || e.metaKey)) return;

      const key = e.key.toLowerCase();
      if (key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if (key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    handleUndo,
    redo,
    deleteFieldById,
    selectedFieldId,
    isPreviewMode,
    isTourOpen,
    draggingFieldId
  ]);

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
        if (!isMounted || !item) return;

        setRecognition(item);
        const normalized = normalizeLoadedTemplate(item.template);
        loadTemplate(normalized);
        if (normalized.fields.length > 0) {
          setSelectedFieldId(normalized.fields[0].id);
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

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [id, loadTemplate, showNotification]);

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

    const newField = buildDefaultField(def);
    addField(newField);
    setSelectedFieldId(newField.id);
    setActiveSidebarTab('properties');
    showNotification(`Campo "${def.label}" añadido a la plantilla.`);
  };

  const handleAddAllFields = () => {
    const toAdd = getMissingTemplateFields(template.fields);
    if (toAdd.length === 0) return;

    addFields(toAdd);
    setSelectedFieldId(toAdd[0].id);
    setActiveSidebarTab('properties');
    showNotification(`Se añadieron ${toAdd.length} campos a la plantilla.`);
  };

  const handleResetFields = () => {
    const defaultFields = buildDefaultTemplateFields();
    resetFields(defaultFields);
    if (defaultFields.length > 0) {
      setSelectedFieldId(defaultFields[0].id);
      setActiveSidebarTab('properties');
    }
    showNotification('Campos restablecidos a las posiciones estándar.');
  };

  const updateSelectedField = (patch: Partial<RecognitionFieldConfig>) => {
    if (!selectedFieldId) return;
    updateFieldProps(selectedFieldId, patch);
  };

  const handleBackgroundUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isPdfUpload =
      file.type === 'application/pdf' ||
      file.type === 'application/x-pdf' ||
      file.name.toLowerCase().endsWith('.pdf');

    setIsUploadingBg(true);
    if (isPdfUpload) {
      showNotification('Convirtiendo página 1 del PDF a imagen...', 'warning', {
        persistent: true
      });
    }

    try {
      const result = await processBackgroundImageFile(file);
      const bgPatch = extractBackgroundTemplatePatch(result);
      setBackground(bgPatch);

      if (typeof result !== 'string') {
        const pageCount = result.pageCount ?? 1;
        if (pageCount > 1 && result.wasCompressedHeavily) {
          showNotification(
            `El PDF tiene ${pageCount} páginas; se usó la página 1 y se comprimió para ajustarla al límite. Si notas pérdida de nitidez, sube una imagen PNG o JPG.`,
            'warning'
          );
        } else if (pageCount > 1) {
          showNotification(
            `El PDF tiene ${pageCount} páginas; se usó únicamente la página 1 como fondo.`,
            'warning'
          );
        } else if (result.wasCompressedHeavily) {
          showNotification(
            'El fondo se comprimió para cumplir con el tamaño máximo. Si notas pérdida de nitidez, sube una imagen PNG o JPG.',
            'warning'
          );
        } else {
          showNotification('Imagen de fondo cargada y optimizada exitosamente.');
        }
      } else {
        showNotification('Imagen de fondo cargada y optimizada exitosamente.');
      }
    } catch (err) {
      console.error('Error uploading background image:', err);
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Error al procesar el archivo de fondo.';
      showNotification(message, 'error');
    } finally {
      setIsUploadingBg(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveBackground = () => {
    clearBackground();
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
      <output
        className="max-w-7xl mx-auto py-12 flex flex-col items-center justify-center gap-3"
      >
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-neutral/75">Cargando diseñador de plantilla...</p>
      </output>
    );
  }

  if (!recognition) {
    return (
      <ErrorAlert
        variant="centered"
        title="Reconocimiento no encontrado"
        message="El tipo de reconocimiento solicitado no existe o fue eliminado."
        retryLabel="Volver al Catálogo"
        onRetry={() => {
          void navigate('/reconocimientos');
        }}
      />
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-5 font-sans py-2 pb-12 px-2 sm:px-4">
      {/* Toast Alert */}
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.type}
          onDismiss={dismissNotification}
        />
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
        canUndo={canUndo}
        canRedo={canRedo}
        isSnapEnabled={isSnapEnabled}
        onUndo={handleUndo}
        onRedo={redo}
        onToggleSnap={setIsSnapEnabled}
        onTogglePreview={setIsPreviewMode}
        onUploadClick={() => fileInputRef.current?.click()}
        onSave={handleSaveTemplate}
        onBack={() => {
          void navigate('/reconocimientos');
        }}
        onStartTour={() => startTour()}
      />

      {/* Main Ergonomic 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Large Spacious Canvas Area */}
        <DesignerCanvas
          canvasRef={canvasRef}
          template={template}
          selectedFieldId={selectedFieldId}
          draggingFieldId={draggingFieldId}
          isPreviewMode={isPreviewMode}
          fontScale={fontScale}
          activeGuides={activeGuides}
          recognitionName={recognition.name}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerDownField={handlePointerDown}
          onUpdateFieldCoordinates={moveFieldCoordinates}
          onSelectField={handleSelectField}
          onDeselectField={handleDeselectField}
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
