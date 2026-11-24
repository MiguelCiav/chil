import React, { useMemo, useState } from 'react';
import { AlertTriangle, Award } from 'lucide-react';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Field
} from '../../../../components';
import { ScoutMember } from '../../types';
import { validateManualRecognitionCode } from '../../utils/codeGenerator';
import { getMemberDocId } from '../../utils/memberIdentity';

export interface ManualCodeAssignmentItem {
  previous: ScoutMember;
  member: ScoutMember;
  previousCode?: string;
}

export interface ManualCodeAssignmentModalProps {
  isOpen: boolean;
  items: ManualCodeAssignmentItem[];
  existingCodes: string[];
  sessionExpiredMidRun?: boolean;
  saving: boolean;
  onCancel: () => void;
  onConfirm: (assignedCodesByDocId: Record<string, string>) => Promise<void>;
}

interface ManualCodeAssignmentFormProps {
  items: ManualCodeAssignmentItem[];
  existingCodes: string[];
  sessionExpiredMidRun: boolean;
  saving: boolean;
  onCancel: () => void;
  onConfirm: (assignedCodesByDocId: Record<string, string>) => Promise<void>;
}

const ManualCodeAssignmentForm: React.FC<ManualCodeAssignmentFormProps> = ({
  items,
  existingCodes,
  sessionExpiredMidRun,
  saving,
  onCancel,
  onConfirm
}) => {
  const [codesByDocId, setCodesByDocId] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const item of items) {
      initial[getMemberDocId(item.previous)] = '';
    }
    return initial;
  });

  const validationByDocId = useMemo(() => {
    const result: Record<string, { normalized: string; error: string | null }> = {};
    for (const item of items) {
      const docId = getMemberDocId(item.previous);
      const otherModalCodes = items
        .filter((other) => getMemberDocId(other.previous) !== docId)
        .map((other) => codesByDocId[getMemberDocId(other.previous)] ?? '')
        .filter(Boolean);

      const blockedExisting = [...existingCodes, ...otherModalCodes];
      const excluded = item.previousCode ? [item.previousCode] : undefined;

      result[docId] = validateManualRecognitionCode(
        codesByDocId[docId] ?? '',
        blockedExisting,
        excluded
      );
    }
    return result;
  }, [codesByDocId, existingCodes, items]);

  const isAllValid = items.every((item) => {
    const docId = getMemberDocId(item.previous);
    return validationByDocId[docId]?.error === null;
  });

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAllValid || saving) return;

    const normalizedMap: Record<string, string> = {};
    for (const item of items) {
      const docId = getMemberDocId(item.previous);
      normalizedMap[docId] = validationByDocId[docId].normalized;
    }
    await onConfirm(normalizedMap);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
      <ModalBody className="space-y-4">
        <p className="text-xs sm:text-sm text-neutral/80">
          Este lote utiliza códigos manuales. Ingresa un código único para cada miembro recién activado en Impeesa. Una vez guardado, el código quedará bloqueado.
        </p>

        {sessionExpiredMidRun && (
          <div
            role="alert"
            className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              La sesión de Impeesa expiró durante la consulta. Asigna y guarda estos códigos ahora; luego reconecta tu sesión en Ajustes para re-verificar los miembros restantes.
            </span>
          </div>
        )}

        <div className="space-y-3">
          {items.map((item) => {
            const docId = getMemberDocId(item.previous);
            const rawVal = codesByDocId[docId] ?? '';
            const validation = validationByDocId[docId];
            const showError = rawVal.length > 0 && validation?.error !== null;

            return (
              <div
                key={docId}
                className="border border-gray-200 rounded-xl p-3.5 bg-gray-50/50 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-neutral">
                      {item.member.first_names} {item.member.last_names}
                    </div>
                    <div className="text-xs font-mono text-neutral/75">
                      C.I. {item.member.identity}
                    </div>
                  </div>
                  {item.previousCode && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-xs font-mono text-purple-900">
                      Código anterior no reutilizable: <strong>{item.previousCode}</strong>
                    </span>
                  )}
                </div>

                <Field
                  id={`manual-code-${docId}`}
                  label="Nuevo Código de Reconocimiento *"
                  value={rawVal}
                  disabled={saving}
                  variant={showError ? 'error' : 'default'}
                  errorText={showError ? (validation?.error ?? undefined) : undefined}
                  placeholder="Ej. SP-5Y-042"
                  onChange={(e) =>
                    setCodesByDocId((prev) => ({
                      ...prev,
                      [docId]: e.target.value.toUpperCase()
                    }))
                  }
                />
              </div>
            );
          })}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={!isAllValid || saving}>
          {saving ? 'Guardando...' : 'Guardar y Activar'}
        </Button>
      </ModalFooter>
    </form>
  );
};

export const ManualCodeAssignmentModal: React.FC<ManualCodeAssignmentModalProps> = ({
  isOpen,
  items,
  existingCodes,
  sessionExpiredMidRun = false,
  saving,
  onCancel,
  onConfirm
}) => {
  const modalKey = items.map((item) => getMemberDocId(item.previous)).join('|');

  return (
    <Modal isOpen={isOpen} onClose={() => !saving && onCancel()} className="max-w-xl">
      <ModalHeader onClose={() => !saving && onCancel()}>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Award className="w-5 h-5" />
          </div>
          <span>Asignar Códigos a Miembros Activados</span>
        </div>
      </ModalHeader>
      {isOpen && items.length > 0 && (
        <ManualCodeAssignmentForm
          key={modalKey}
          items={items}
          existingCodes={existingCodes}
          sessionExpiredMidRun={sessionExpiredMidRun}
          saving={saving}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      )}
    </Modal>
  );
};
