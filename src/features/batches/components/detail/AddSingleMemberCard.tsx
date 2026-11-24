import React, { useState } from 'react';
import { AlertTriangle, Search, UserPlus } from 'lucide-react';
import { Card, CardBody, Button, Field, ErrorAlert } from '../../../../components';
import { MemberStatusBadge } from '../../../../domain/components';
import { resolveMemberHierarchy } from '../../../../utils/memberHierarchy';
import type { ScraperMemberDetails } from '../../api';
import { Batch, BatchCodeMode, ScoutGroup, ScoutMember, getUnitBadge } from '../../types';
import {
  generateUniqueRecognitionCode,
  validateManualRecognitionCode
} from '../../utils/codeGenerator';
import {
  hasInvalidDocPathChars,
  isGenericIdentity,
  normalizeCedula
} from '../../utils/memberIdentity';
import {
  buildScrapedMemberRecord,
  buildUnregisteredMemberRecord
} from '../../utils/scraperVerificationPool';

export type VerifySingleAddResult =
  | { status: 'found'; details: ScraperMemberDetails }
  | { status: 'not_found' }
  | { status: 'aborted' }
  | { status: 'error'; message: string };

export interface AddSingleMemberCardProps {
  batch: Batch;
  userId?: string;
  batchCodeMode: BatchCodeMode;
  existingIdentities: string[];
  existingCodes: string[];
  groups: ScoutGroup[];
  onVerifyCedula: (normalizedCedula: string) => Promise<VerifySingleAddResult>;
  onAddMember: (member: ScoutMember) => Promise<void>;
  disabled?: boolean;
}

interface PreviewState {
  member: ScoutMember;
  notFound: boolean;
}

export const AddSingleMemberCard: React.FC<AddSingleMemberCardProps> = ({
  batch,
  userId,
  batchCodeMode,
  existingIdentities,
  existingCodes,
  groups,
  onVerifyCedula,
  onAddMember,
  disabled = false
}) => {
  const [cedulaInput, setCedulaInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [adding, setAdding] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [manualCodeError, setManualCodeError] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState('');

  const resetPreview = () => {
    setPreview(null);
    setManualCode('');
    setManualCodeError(null);
    setGeneratedCode('');
    setVerifyError(null);
  };

  const handleVerify = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (disabled || verifying || adding) return;

    setInputError(null);
    setVerifyError(null);

    const trimmed = cedulaInput.trim();
    if (!trimmed) {
      setInputError('Debe ingresar una cédula.');
      return;
    }
    if (hasInvalidDocPathChars(trimmed)) {
      setInputError('La cédula no puede contener el carácter "/".');
      return;
    }
    if (isGenericIdentity(trimmed)) {
      setInputError('Debe ingresar una cédula numérica válida (no genérica).');
      return;
    }

    const normalized = normalizeCedula(trimmed);
    const isDuplicate = existingIdentities.some(
      (existing) => !isGenericIdentity(existing) && normalizeCedula(existing) === normalized
    );
    if (isDuplicate) {
      setInputError('Esta cédula ya pertenece a un miembro del lote.');
      return;
    }

    setVerifying(true);
    try {
      const result = await onVerifyCedula(normalized);
      if (result.status === 'aborted') {
        return;
      }
      if (result.status === 'error') {
        setVerifyError(result.message);
        return;
      }

      const targetUserId = batch.user_id ?? userId;
      if (result.status === 'not_found') {
        const unregistered = buildUnregisteredMemberRecord(
          normalized,
          'young',
          'tropa',
          batch.id,
          targetUserId,
          { region_id: 0, district_id: 0, group_id: 0 }
        );
        setPreview({ member: unregistered, notFound: true });
        setGeneratedCode('');
        setManualCode('');
        return;
      }

      const scrapedMember = buildScrapedMemberRecord(
        normalized,
        result.details,
        undefined,
        undefined,
        batch.id,
        targetUserId
      );
      setPreview({ member: scrapedMember, notFound: false });
      if (scrapedMember.status === 'active' && batchCodeMode === 'auto') {
        setGeneratedCode(generateUniqueRecognitionCode(existingCodes));
      } else {
        setGeneratedCode('');
      }
      setManualCode('');
      setManualCodeError(null);
    } finally {
      setVerifying(false);
    }
  };

  const handleConfirmAdd = async () => {
    if (!preview || disabled || adding) return;

    let finalCode: string | undefined;
    if (preview.member.status === 'active') {
      if (batchCodeMode === 'manual') {
        const validation = validateManualRecognitionCode(manualCode, existingCodes);
        if (validation.error) {
          setManualCodeError(validation.error);
          return;
        }
        finalCode = validation.normalized;
      } else {
        const existingSet = new Set(existingCodes.map((c) => c.trim().toUpperCase()));
        finalCode =
          generatedCode && !existingSet.has(generatedCode.toUpperCase())
            ? generatedCode
            : generateUniqueRecognitionCode(existingCodes);
      }
    }

    setAdding(true);
    try {
      await onAddMember({
        ...preview.member,
        ...(finalCode ? { recognition_code: finalCode } : { recognition_code: undefined })
      });
      setCedulaInput('');
      resetPreview();
    } finally {
      setAdding(false);
    }
  };

  const previewGroupLabel = (() => {
    if (!preview) return '-';
    const groupId = resolveMemberHierarchy(preview.member, batch, {
      regions: [],
      districts: [],
      groups
    }).groupId;
    if (groupId === 0) return 'Sin grupo asignado';
    return groups.find((g) => g.id === groupId)?.name ?? `Grupo ${groupId}`;
  })();

  const previewUnitBadge = preview ? getUnitBadge(preview.member.unit) : null;

  return (
    <Card data-walkthrough="batch-detail-add-member">
      <CardBody className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-neutral flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" />
              Añadir Miembro al Lote
            </h3>
            <p className="text-xs text-neutral/75 mt-0.5">
              Para agregar varios miembros a la vez, crea un nuevo lote y fusiónalo desde el listado.
            </p>
          </div>
        </div>

        {verifyError && <ErrorAlert variant="compact" message={verifyError} />}

        <form onSubmit={handleVerify} className="flex flex-col sm:flex-row items-start gap-3">
          <div className="w-full sm:flex-1">
            <Field
              id="add-single-member-cedula"
              label="Cédula del miembro"
              placeholder="Ej. 12345678"
              value={cedulaInput}
              disabled={disabled || verifying || adding}
              variant={inputError ? 'error' : 'default'}
              errorText={inputError ?? undefined}
              onChange={(e) => {
                setCedulaInput(e.target.value);
                setInputError(null);
                if (preview || verifyError) {
                  resetPreview();
                }
              }}
            />
          </div>
          <div className="sm:pt-6 w-full sm:w-auto">
            <Button
              type="submit"
              variant="outline"
              disabled={disabled || verifying || adding}
              icon={<Search size={16} />}
              className="w-full sm:w-auto"
            >
              {verifying ? 'Verificando...' : 'Verificar en Impeesa'}
            </Button>
          </div>
        </form>

        {preview && (
          <div className="border border-primary/20 bg-primary/5 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-bold text-neutral">
                  {preview.member.first_names} {preview.member.last_names}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral/75">
                  <span className="font-mono">C.I. {preview.member.identity}</span>
                  <span>•</span>
                  <span>{previewGroupLabel}</span>
                  {previewUnitBadge && (
                    <>
                      <span>•</span>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full border text-[11px] font-semibold ${previewUnitBadge.badgeClass}`}
                      >
                        {previewUnitBadge.label}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <MemberStatusBadge
                status={preview.member.status}
                solventUntil={
                  preview.member.is_solvent || preview.member.status === 'active'
                    ? preview.member.solvent_until
                    : undefined
                }
              />
            </div>

            {preview.member.status === 'active' ? (
              batchCodeMode === 'auto' ? (
                <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs">
                  <span className="text-neutral/75 font-medium">
                    Código de reconocimiento asignado (bloqueado al guardar)
                  </span>
                  <span className="font-mono font-bold text-primary">{generatedCode}</span>
                </div>
              ) : (
                <Field
                  id="add-single-member-manual-code"
                  label="Código de Reconocimiento *"
                  placeholder="Ej. SP-5Y-050"
                  value={manualCode}
                  disabled={adding}
                  variant={manualCodeError ? 'error' : 'default'}
                  errorText={manualCodeError ?? undefined}
                  onChange={(e) => {
                    setManualCode(e.target.value.toUpperCase());
                    setManualCodeError(null);
                  }}
                />
              )
            ) : (
              <div
                role="alert"
                className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  {preview.notFound
                    ? 'Esta cédula no figura registrada en Impeesa. Se agregará como Pendiente sin código de reconocimiento.'
                    : 'Este miembro figura Inactivo en Impeesa. Se agregará como Pendiente sin código de reconocimiento.'}
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={resetPreview}
                disabled={adding}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleConfirmAdd}
                disabled={disabled || adding}
                icon={<UserPlus size={16} />}
              >
                {adding ? 'Agregando...' : 'Agregar al lote'}
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
};
