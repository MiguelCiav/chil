import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Upload,
  Eye,
  Edit3,
  Plus,
  Trash2,
  Move,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Palette as PaletteIcon,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  User,
  CreditCard,
  Award,
  MapPin,
  Compass,
  Users,
  Calendar,
  Hash,
  X,
  AlertCircle,
  FileImage,
  Layers,
  Sliders
} from 'lucide-react';

import { Card, CardBody, CardHeader } from '../../../components/Card';
import { Button } from '../../../components/Button';
import {
  RecognitionType,
  CertificateTemplate,
  RecognitionFieldConfig,
  RecognitionFieldKey,
  AVAILABLE_TEMPLATE_FIELDS,
  MOCK_CERTIFICATE_DATA,
  DEFAULT_CERTIFICATE_TEMPLATE
} from '../types';
import {
  getRecognitionTypeById,
  saveCertificateTemplate,
  processBackgroundImageFile
} from '../api';
import { getNormalizedPageDimensions } from '../services/certificatePdfGenerator';

const FIELD_ICONS: Record<RecognitionFieldKey, React.ReactNode> = {
  full_name: <User className="w-4 h-4" />,
  identity: <CreditCard className="w-4 h-4" />,
  recognition_name: <Award className="w-4 h-4" />,
  region: <MapPin className="w-4 h-4" />,
  district: <Compass className="w-4 h-4" />,
  group: <Users className="w-4 h-4" />,
  issue_date: <Calendar className="w-4 h-4" />,
  recognition_code: <Hash className="w-4 h-4" />
};

const PRESET_COLORS = [
  { label: 'Verde Scout', value: '#1b7a37' },
  { label: 'Terracota', value: '#8c4e37' },
  { label: 'Azul Marino', value: '#1e3a8a' },
  { label: 'Rojo Carmesí', value: '#b91c1c' },
  { label: 'Negro Carbón', value: '#111827' },
  { label: 'Gris Oscuro', value: '#4b5563' }
];

function getFormatBadgeText(
  width: number,
  height: number,
  aspectRatio?: number,
  hasCustomBackground?: boolean
): string {
  if (!hasCustomBackground) {
    return 'Formato: 297 × 210 mm';
  }

  const ratio = aspectRatio || (width && height ? width / height : 297 / 210);

  let ratioLabel: string;
  if (Math.abs(ratio - 16 / 9) < 0.04) {
    ratioLabel = '16:9';
  } else if (Math.abs(ratio - 4 / 3) < 0.04) {
    ratioLabel = '4:3';
  } else if (Math.abs(ratio - 297 / 210) < 0.04) {
    ratioLabel = 'A4 Horizontal';
  } else if (Math.abs(ratio - 210 / 297) < 0.04) {
    ratioLabel = 'A4 Vertical';
  } else if (Math.abs(ratio - 3 / 2) < 0.04) {
    ratioLabel = '3:2';
  } else if (Math.abs(ratio - 16 / 10) < 0.04) {
    ratioLabel = '16:10';
  } else if (Math.abs(ratio - 1) < 0.04) {
    ratioLabel = '1:1';
  } else {
    ratioLabel = `${Math.round(ratio * 100) / 100}:1`;
  }

  return `Formato: ${width} × ${height} (${ratioLabel})`;
}

export const CertificateDesigner: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [recognition, setRecognition] = useState<RecognitionType | null>(null);
  const [template, setTemplate] = useState<CertificateTemplate>(DEFAULT_CERTIFICATE_TEMPLATE);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'palette' | 'properties' | 'format'>('palette');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploadingBg, setIsUploadingBg] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [canvasPixelWidth, setCanvasPixelWidth] = useState<number>(0);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragInfoRef = useRef<{
    isDragging: boolean;
    fieldId: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);

  // Monitor DOM canvas pixel width for 1:1 WYSIWYG proportional font scaling
  useEffect(() => {
    if (!canvasRef.current) return;
    const updateWidth = () => {
      if (canvasRef.current) {
        const clientWidth = canvasRef.current.clientWidth;
        if (clientWidth > 0) {
          setCanvasPixelWidth(clientWidth);
        }
      }
    };

    updateWidth();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0) {
            setCanvasPixelWidth(entry.contentRect.width);
          }
        }
      });
      observer.observe(canvasRef.current);
      return () => observer.disconnect();
    } else {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }
  }, [template.aspect_ratio, template.page_width, template.page_height]);

  const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

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

  // Selected field object
  const selectedField = template.fields.find((f) => f.id === selectedFieldId) || null;

  // Add field from palette to canvas
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

  // Remove field from canvas
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

  // Add all fields from palette
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

  // Reset template fields to standard defaults
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

  // Update selected field property
  const updateSelectedField = (patch: Partial<RecognitionFieldConfig>) => {
    if (!selectedFieldId) return;
    setTemplate((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === selectedFieldId ? { ...f, ...patch } : f))
    }));
  };

  // Handle Background Image Upload & Dynamic Aspect Ratio Extraction
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

  // Remove background image and reset to standard A4 format
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

  // Save template to Firestore
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

  // Drag-and-drop pointer event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, fieldId: string) => {
    if (isPreviewMode) return;
    e.stopPropagation();
    e.preventDefault();

    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      // safe fallback
    }

    const field = template.fields.find((f) => f.id === fieldId);
    if (!field) return;

    setSelectedFieldId(fieldId);
    setActiveSidebarTab('properties');

    dragInfoRef.current = {
      isDragging: true,
      fieldId,
      startX: e.clientX,
      startY: e.clientY,
      initialX: field.x,
      initialY: field.y
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragInfoRef.current?.isDragging || !canvasRef.current) return;

    const { fieldId, startX, startY, initialX, initialY } = dragInfoRef.current;
    const canvasRect = canvasRef.current.getBoundingClientRect();

    if (canvasRect.width === 0 || canvasRect.height === 0) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    const percentDeltaX = (deltaX / canvasRect.width) * 100;
    const percentDeltaY = (deltaY / canvasRect.height) * 100;

    let newX = Math.round((initialX + percentDeltaX) * 10) / 10;
    let newY = Math.round((initialY + percentDeltaY) * 10) / 10;

    // Clamp coordinates inside canvas boundaries (2% to 98%)
    newX = Math.max(2, Math.min(98, newX));
    newY = Math.max(2, Math.min(98, newY));

    setTemplate((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === fieldId ? { ...f, x: newX, y: newY } : f))
    }));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragInfoRef.current?.isDragging) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Safe fallback
      }
      dragInfoRef.current = null;
    }
  };

  // Helper font family styling
  const getFontFamilyStyle = (family: RecognitionFieldConfig['font_family']) => {
    switch (family) {
      case 'times':
        return 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif';
      case 'courier':
        return 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace';
      case 'helvetica':
      default:
        return 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    }
  };

  // Transform alignment calculation
  const getAlignTransform = (align: RecognitionFieldConfig['align']) => {
    switch (align) {
      case 'left':
        return 'translate(0%, -50%)';
      case 'right':
        return 'translate(-100%, -50%)';
      case 'center':
      default:
        return 'translate(-50%, -50%)';
    }
  };

  // Value rendering based on mode
  const getFieldDisplayText = (field: RecognitionFieldConfig) => {
    if (isPreviewMode) {
      if (field.field_key === 'recognition_name' && recognition?.name) {
        return recognition.name;
      }
      return MOCK_CERTIFICATE_DATA[field.field_key] || field.label;
    }
    return `[${field.label}]`;
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

  const normalizedDimensions = getNormalizedPageDimensions(template);
  const docWidthMm = normalizedDimensions.width;
  const docWidthPt = docWidthMm * (72 / 25.4);
  const fontScale =
    canvasPixelWidth > 0 && docWidthPt > 0 ? canvasPixelWidth / docWidthPt : 800 / docWidthPt || 1;

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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-primary/20 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate('/reconocimientos')}
            icon={<ArrowLeft size={16} />}
            className="flex-shrink-0"
            aria-label="Volver al catálogo"
          >
            Volver
          </Button>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-neutral tracking-tight">
              {recognition.name}
            </h1>
          </div>
        </div>

        {/* Global Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode Switcher */}
          <div className="inline-flex rounded-xl p-1 bg-gray-100 border border-gray-200">
            <button
              type="button"
              onClick={() => setIsPreviewMode(false)}
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
              onClick={() => setIsPreviewMode(true)}
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
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingBg}
            icon={<Upload size={15} />}
          >
            {isUploadingBg
              ? 'Subiendo...'
              : template.background_url
              ? 'Cambiar Fondo'
              : 'Subir Fondo'}
          </Button>

          {/* Save Template Primary Button */}
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSaveTemplate}
            disabled={isSaving}
            icon={<Save size={15} />}
            className="shadow-sm"
          >
            {isSaving ? 'Guardando...' : 'Guardar Plantilla'}
          </Button>
        </div>
      </div>

      {/* Main Ergonomic 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Large Spacious Canvas Area (lg:col-span-8 xl:col-span-8 2xl:col-span-9) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-8 xl:col-span-8 2xl:col-span-9 space-y-4">
          {/* Large Interactive Canvas Viewport */}
          <div className="bg-gray-100/80 border border-gray-200/80 rounded-2xl p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[480px]">
            {/* The Dynamic Canvas Box */}
            <div
              ref={canvasRef}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
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
                const displayText = getFieldDisplayText(field);
                const displayFontSizePx = Math.max(
                  8,
                  Math.round(field.font_size * fontScale * 100) / 100
                );

                return (
                  <div
                    key={field.id}
                    role="button"
                    tabIndex={0}
                    onPointerDown={(e) => handlePointerDown(e, field.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isPreviewMode) {
                        setSelectedFieldId(field.id);
                        setActiveSidebarTab('properties');
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (!isPreviewMode) {
                          setSelectedFieldId(field.id);
                          setActiveSidebarTab('properties');
                        }
                      }
                    }}
                    className={`absolute z-10 select-none transition-shadow ${
                      isPreviewMode
                        ? 'cursor-default'
                        : isSelected
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-white bg-primary/10 rounded cursor-grab active:cursor-grabbing shadow-lg'
                        : 'hover:ring-1 hover:ring-primary/50 hover:bg-primary/5 rounded cursor-pointer'
                    }`}
                    style={{
                      left: `${field.x}%`,
                      top: `${field.y}%`,
                      transform: getAlignTransform(field.align),
                      fontFamily: getFontFamilyStyle(field.font_family),
                      fontSize: `${displayFontSizePx}px`,
                      fontWeight: field.font_weight === 'bold' ? 700 : 400,
                      fontStyle: field.font_weight === 'italic' ? 'italic' : 'normal',
                      color: field.color,
                      textAlign: field.align,
                      padding: isPreviewMode ? '0px' : '2px 6px',
                      whiteSpace: 'nowrap'
                    }}
                    title={!isPreviewMode ? `${field.label} (${field.x}%, ${field.y}%)` : undefined}
                  >
                    {/* Floating Position Badge when Selected */}
                    {isSelected && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap flex items-center gap-1 pointer-events-none">
                        <Move className="w-2.5 h-2.5" />
                        <span>
                          {field.label} ({field.x}%, {field.y}%)
                        </span>
                      </div>
                    )}

                    {displayText}
                  </div>
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
          <div className="bg-white border border-gray-200 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-bold shadow-xs">
                <Layers className="w-3.5 h-3.5" />
                <span>{formatBadgeText}</span>
              </span>

              <span className="text-xs text-neutral/50 hidden sm:inline">
                {template.orientation === 'portrait' ? 'Orientación Vertical' : 'Orientación Horizontal'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-neutral/60">
              <span className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg">
                <Sliders className="w-3.5 h-3.5 text-primary" />
                <span>{template.fields.length} campos posicionados</span>
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Control Panel Sidebar (lg:col-span-4 xl:col-span-4 2xl:col-span-3) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 xl:col-span-4 2xl:col-span-3 space-y-4">
          {/* Quick Tab Switcher */}
          <div className="flex rounded-2xl p-1 bg-white border border-gray-200 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveSidebarTab('palette')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                activeSidebarTab === 'palette'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-neutral/60 hover:text-neutral hover:bg-gray-50'
              }`}
            >
              <PaletteIcon className="w-3.5 h-3.5" />
              <span>Campos</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSidebarTab('properties')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                activeSidebarTab === 'properties'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-neutral/60 hover:text-neutral hover:bg-gray-50'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Estilo</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSidebarTab('format')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                activeSidebarTab === 'format'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-neutral/60 hover:text-neutral hover:bg-gray-50'
              }`}
            >
              <FileImage className="w-3.5 h-3.5" />
              <span>Fondo</span>
            </button>
          </div>

          {/* ===================================================================== */}
          {/* SECCIÓN 1: Paleta de Campos */}
          {/* ===================================================================== */}
          {activeSidebarTab === 'palette' && (
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="py-3 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PaletteIcon className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold text-neutral">Paleta de Campos</h2>
                </div>
                <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                  {template.fields.length} / {AVAILABLE_TEMPLATE_FIELDS.length}
                </span>
              </CardHeader>
              <CardBody className="p-3 space-y-2">
                <p className="text-xs text-neutral/60 px-1 mb-2">
                  Haga clic para añadir campos o seleccionarlos en el certificado.
                </p>

                <div className="space-y-1.5">
                  {AVAILABLE_TEMPLATE_FIELDS.map((def) => {
                    const placedField = template.fields.find((f) => f.field_key === def.field_key);
                    const isPlaced = !!placedField;
                    const isSelected = placedField && placedField.id === selectedFieldId;

                    return (
                      <div
                        key={def.field_key}
                        className={`flex items-center justify-between p-2 rounded-xl text-xs transition-all border ${
                          isSelected
                            ? 'bg-primary/10 border-primary text-primary font-bold'
                            : isPlaced
                            ? 'bg-gray-50 border-gray-200 text-neutral/80 hover:bg-gray-100'
                            : 'bg-white border-dashed border-gray-300 text-neutral/60 hover:border-primary/40 hover:bg-primary/5'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (isPlaced) {
                              setSelectedFieldId(placedField.id);
                              setActiveSidebarTab('properties');
                            } else {
                              handleAddField(def.field_key);
                            }
                          }}
                          className="flex items-center gap-2 flex-1 text-left font-medium overflow-hidden"
                        >
                          <span className="text-primary flex-shrink-0">
                            {FIELD_ICONS[def.field_key]}
                          </span>
                          <span className="truncate">{def.label}</span>
                        </button>

                        {isPlaced ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] bg-green-100 text-green-700 font-semibold px-1.5 py-0.5 rounded">
                              En plantilla
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveField(placedField.id);
                              }}
                              className="p-1 text-neutral/40 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Quitar campo"
                              aria-label={`Eliminar campo ${def.label}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddField(def.field_key)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[11px] transition-colors"
                            aria-label={`Añadir ${def.label}`}
                          >
                            <Plus className="w-3 h-3" />
                            <span>Añadir</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Quick Actions in Palette */}
                <div className="pt-3 border-t border-gray-100 space-y-1.5">
                  {template.fields.length < AVAILABLE_TEMPLATE_FIELDS.length && (
                    <button
                      type="button"
                      onClick={handleAddAllFields}
                      className="w-full py-1.5 text-xs text-primary hover:bg-primary/5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Añadir todos los campos</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleResetFields}
                    className="w-full py-1.5 text-xs text-neutral/60 hover:text-neutral hover:bg-gray-100 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restablecer posiciones</span>
                  </button>
                </div>
              </CardBody>
            </Card>
          )}

          {/* ===================================================================== */}
          {/* SECCIÓN 2: Propiedades del Campo Seleccionado */}
          {/* ===================================================================== */}
          {activeSidebarTab === 'properties' && (
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="py-3 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Type className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold text-neutral">Propiedades del Campo</h2>
                </div>
                {selectedField && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFieldId(null);
                      setActiveSidebarTab('palette');
                    }}
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
                              updateSelectedField({
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
                          updateSelectedField({ font_size: parseInt(e.target.value, 10) })
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
                              updateSelectedField({
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
                              onClick={() => updateSelectedField({ color: c.value })}
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
                          onChange={(e) => updateSelectedField({ color: e.target.value })}
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
                              updateSelectedField({
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
                              updateSelectedField({
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
                              updateSelectedField({
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
                        onClick={() => handleRemoveField(selectedField.id)}
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
          )}

          {/* ===================================================================== */}
          {/* SECCIÓN 3: Información de Formato y Fondo */}
          {/* ===================================================================== */}
          {activeSidebarTab === 'format' && (
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
                        onClick={() => fileInputRef.current?.click()}
                        icon={<Upload size={14} />}
                      >
                        Cambiar
                      </Button>
                      <button
                        type="button"
                        onClick={handleRemoveBackground}
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
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingBg}
                      icon={<Upload size={14} />}
                    >
                      {isUploadingBg ? 'Subiendo...' : 'Subir Fondo Personalizado'}
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default CertificateDesigner;
