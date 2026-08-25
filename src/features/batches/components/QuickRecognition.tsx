import React from 'react';
import {
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '../../../components/Button';
import { useQuickRecognition } from '../hooks/useQuickRecognition';
import { QuickRecognitionSuccess } from './quick/QuickRecognitionSuccess';
import { RecognitionFieldsSection } from './quick/RecognitionFieldsSection';
import { RecipientFieldsSection } from './quick/RecipientFieldsSection';

export const QuickRecognition: React.FC = () => {
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
    <div className="max-w-4xl mx-auto space-y-6 font-sans py-4">
      {/* Toast Notification */}
      {showToast && (
        <div
          role="alert"
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 text-white px-5 py-3 rounded-2xl shadow-xl border animate-fade-in ${
            toastType === 'success'
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
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Zap className="w-6 h-6 fill-amber-500/20" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral tracking-tight flex items-center gap-2">
                Emisión Rápida de Reconocimiento
              </h1>
              <p className="text-sm text-neutral/60 mt-0.5">
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
            <div className="flex items-center justify-end gap-3 pt-2">
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
    </div>
  );
};
