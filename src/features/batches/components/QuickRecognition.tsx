import React from 'react';
import {
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '../../../components/Button';
import { useAuth } from '../../auth';
import {
  useWalkthrough,
  WalkthroughOverlay,
  WalkthroughHelpButton,
  WalkthroughStep
} from '../../../components/walkthrough';
import { useQuickRecognition } from '../hooks/useQuickRecognition';
import { QuickRecognitionSuccess } from './quick/QuickRecognitionSuccess';
import { RecognitionFieldsSection } from './quick/RecognitionFieldsSection';
import { RecipientFieldsSection } from './quick/RecipientFieldsSection';

const QUICK_RECOGNITION_TOUR_STEPS: WalkthroughStep[] = [
  {
    id: 'quick-rec-header',
    targetSelector: '[data-walkthrough="quick-rec-header"]',
    title: 'Emisión Rápida de Reconocimientos',
    content: 'Este módulo te permite emitir y descargar un reconocimiento individual en un solo paso, ideal para reconocer a una persona sin procesar lotes masivos.',
    placement: 'bottom'
  },
  {
    id: 'quick-rec-recognition-section',
    targetSelector: '[data-walkthrough="quick-rec-recognition-section"]',
    title: 'Tipo de Reconocimiento y Ubicación',
    content: 'Selecciona el tipo de reconocimiento a otorgar y la estructura geográfica (Región, Distrito, Grupo). Si es para alguien no scout (agradecimiento), estos campos son opcionales.',
    placement: 'bottom'
  },
  {
    id: 'quick-rec-recipient-section',
    targetSelector: '[data-walkthrough="quick-rec-recipient-section"]',
    title: 'Datos del Reconocido y Unidad',
    content: "Selecciona la unidad. Para miembros scouts, ingresa la cédula y haz clic en 'Consultar' para autocompletar sus datos desde el sistema de registro.",
    placement: 'bottom'
  },
  {
    id: 'quick-rec-actions-section',
    targetSelector: '[data-walkthrough="quick-rec-actions-section"]',
    title: 'Código y Descarga Inmediata',
    content: "El código oficial se genera automáticamente (puedes regenerarlo o editarlo). Al pulsar 'Emitir y Descargar Reconocimiento', el lote se crea en el sistema y el PDF se descarga al instante.",
    placement: 'top'
  }
];

export const QuickRecognition: React.FC = () => {
  const { user } = useAuth();

  const {
    isOpen: isTourOpen,
    currentStep,
    currentStepIndex,
    totalSteps,
    targetRect,
    startTour,
    nextStep,
    prevStep,
    skipTour
  } = useWalkthrough({
    tourId: 'quick-recognition-tour',
    steps: QUICK_RECOGNITION_TOUR_STEPS,
    autoStart: true,
    userId: user?.uid
  });
  const {
    // Hierarchy & Types
    regions,
    availableRecognitionTypes,
    filteredDistricts,
    filteredGroups,
    loadingHierarchy,

    // Form State
    recognitionType,
    regionId,
    districtId,
    groupId,
    comment,
    unit,
    identity,
    firstNames,
    lastNames,
    recognitionCode,

    // Scraper State
    isSearchingScraper,
    scraperStatus,
    scraperMsg,

    // Validation & Submission
    errors,
    isSubmitting,
    toastMessage,
    showToast,
    toastType,

    // Success State
    successData,

    // Handlers
    handleRegionChange,
    handleDistrictChange,
    handleGroupChange,
    handleRecognitionTypeChange,
    handleUnitChange,
    handleIdentityChange,
    handleFirstNamesChange,
    handleLastNamesChange,
    handleRecognitionCodeChange,
    handleRegenerateCode,
    handleConsult,
    handleSubmit,
    handleEmitAnother,
    setComment
  } = useQuickRecognition();

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans py-2">
      {/* Toast Notification */}
      {showToast && (
        <div
          role="alert"
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 text-white px-5 py-3 rounded-2xl shadow-xl border animate-fade-in ${toastType === 'success'
            ? 'bg-neutral border-primary/30'
            : 'bg-red-700 border-red-500/30'
            }`}
        >
          {toastType === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0" />
          )}
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Success View */}
      {successData ? (
        <QuickRecognitionSuccess
          successData={successData}
          onEmitAnother={handleEmitAnother}
        />
      ) : (
        /* Form View */
        <div className="space-y-6">
          {/* Header */}
          <div data-walkthrough="quick-rec-header" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black text-neutral tracking-tight flex items-center gap-2">
                  Emisión Rápida de Reconocimiento
                </h1>
                <WalkthroughHelpButton onClick={() => startTour()} />
              </div>
              <p className="text-xs sm:text-sm text-neutral/70 mt-1">
                Emite y descarga un reconocimiento individual de forma inmediata en un solo paso.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Datos del Reconocimiento */}
            <RecognitionFieldsSection
              recognitionType={recognitionType}
              onRecognitionTypeChange={handleRecognitionTypeChange}
              availableRecognitionTypes={availableRecognitionTypes}
              regionId={regionId}
              onRegionChange={handleRegionChange}
              regions={regions}
              districtId={districtId}
              onDistrictChange={handleDistrictChange}
              filteredDistricts={filteredDistricts}
              groupId={groupId}
              onGroupChange={handleGroupChange}
              filteredGroups={filteredGroups}
              comment={comment}
              onCommentChange={setComment}
              unit={unit}
              loadingHierarchy={loadingHierarchy}
              errors={errors}
            />

            {/* Section 2: Datos del Homenajeado */}
            <RecipientFieldsSection
              unit={unit}
              onUnitChange={handleUnitChange}
              identity={identity}
              onIdentityChange={handleIdentityChange}
              isSearchingScraper={isSearchingScraper}
              onConsult={handleConsult}
              firstNames={firstNames}
              onFirstNamesChange={handleFirstNamesChange}
              lastNames={lastNames}
              onLastNamesChange={handleLastNamesChange}
              recognitionCode={recognitionCode}
              onRecognitionCodeChange={handleRecognitionCodeChange}
              onRegenerateCode={handleRegenerateCode}
              scraperStatus={scraperStatus}
              scraperMsg={scraperMsg}
              errors={errors}
            />

            {/* Form Submit Button */}
            <div data-walkthrough="quick-rec-actions-section" className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isSubmitting || loadingHierarchy}
                icon={<Zap className="w-5 h-5 fill-current" />}
                className="w-full sm:w-auto shadow-md"
              >
                {isSubmitting ? 'Emitiendo y Generando Reconocimiento...' : 'Emitir y Descargar Reconocimiento'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Walkthrough Interactive Guide Overlay */}
      <WalkthroughOverlay
        isOpen={isTourOpen}
        currentStep={currentStep}
        currentStepIndex={currentStepIndex}
        totalSteps={totalSteps}
        targetRect={targetRect}
        onNext={nextStep}
        onPrev={prevStep}
        onSkip={skipTour}
        onClose={skipTour}
      />
    </div>
  );
};
