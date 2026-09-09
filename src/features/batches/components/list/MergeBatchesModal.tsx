import React, { useState } from 'react';
import { GitMerge, Calendar, Users, Award, AlertCircle, MapPin } from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../../components/Modal';
import { Button } from '../../../../components/Button';
import { mergeBatches } from '../../api';
import { Batch } from '../../types';

export interface BatchMergeOption {
  id: number;
  batch: Batch;
  created_at: string;
  formattedDate: string;
  groupName: string;
  recognitionName: string;
  memberCount: number;
}

export interface MergeBatchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBatches: BatchMergeOption[];
  onMergeSuccess: (newBatch: Batch) => void;
  userId?: string;
}

export const MergeBatchesModal: React.FC<MergeBatchesModalProps> = ({
  isOpen,
  onClose,
  selectedBatches,
  onMergeSuccess,
  userId
}) => {
  const [newComment, setNewComment] = useState('');
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute preview metrics
  const totalCombinedMembers = selectedBatches.reduce((acc, b) => acc + b.memberCount, 0);

  // Determine latest date among selected batches
  const latestBatch = [...selectedBatches].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0];
  const latestFormattedDate = latestBatch?.formattedDate ?? '-';

  // Group summary preview: if all share the same group, show that group, else 'Multigrupo'
  const firstGroupId = selectedBatches[0]?.batch.group_id;
  const allSameGroup = selectedBatches.every(b => b.batch.group_id === firstGroupId);
  const consolidatedGroupLabel = allSameGroup ? (selectedBatches[0]?.groupName || '-') : 'Multigrupo';

  // Recognition type preview
  const firstRecType = selectedBatches[0]?.batch.recognition_type;
  const allSameRecType = selectedBatches.every(b => b.batch.recognition_type === firstRecType);
  const consolidatedRecLabel = allSameRecType
    ? (selectedBatches[0]?.recognitionName || '-')
    : `${selectedBatches[0]?.recognitionName || '-'} (combinado)`;

  const handleMerge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBatches.length < 2) return;

    setMerging(true);
    setError(null);

    try {
      const batchIds = selectedBatches.map(b => b.id);
      const merged = await mergeBatches(
        {
          batchIds,
          newComment: newComment.trim(),
          user_id: userId
        },
        userId
      );
      onMergeSuccess(merged);
    } catch (err) {
      console.error('Error al fusionar lotes:', err);
      const message = err instanceof Error ? err.message : 'Error inesperado al fusionar los lotes';
      setError(message);
    } finally {
      setMerging(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => !merging && onClose()} className="max-w-xl">
      <form onSubmit={handleMerge} className="flex flex-col flex-1 overflow-hidden min-h-0">
        <ModalHeader onClose={() => !merging && onClose()}>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <GitMerge className="w-5 h-5" />
            </div>
            <span>Fusionar Lotes Seleccionados</span>
          </div>
        </ModalHeader>

        <ModalBody className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Description */}
          <p className="text-xs text-neutral/70">
            Se consolidarán los registros de los <strong className="text-neutral">{selectedBatches.length}</strong> lotes seleccionados en un único nuevo lote. Los lotes originales serán reemplazados y los miembros reasignados conservando sus datos de grupo.
          </p>

          {/* Selected Batches List */}
          <div>
            <span className="block uppercase text-xs font-bold mb-2 tracking-wide text-neutral">
              Lotes a fusionar ({selectedBatches.length})
            </span>
            <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-48 overflow-y-auto bg-gray-50/50">
              {selectedBatches.map(b => (
                <div key={b.id} className="p-3 flex items-center justify-between text-xs hover:bg-white transition-colors">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral">Lote #{b.id}</span>
                      {b.batch.comment && (
                        <span className="text-neutral/60 italic truncate max-w-[180px]">
                          &ldquo;{b.batch.comment}&rdquo;
                        </span>
                      )}
                    </div>
                    <div className="text-neutral/60 flex items-center gap-2">
                      <span>{b.groupName}</span>
                      <span>•</span>
                      <span>{b.formattedDate}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-0.5">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold text-[11px]">
                      {b.memberCount} {b.memberCount === 1 ? 'miembro' : 'miembros'}
                    </span>
                    <div className="text-[11px] text-neutral/50 truncate max-w-[120px]">
                      {b.recognitionName}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Merged Batch Preview Summary */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 space-y-2.5">
            <span className="block text-xs font-bold text-neutral uppercase tracking-wide">
              Vista previa del nuevo lote consolidado
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-neutral/60 text-[11px]">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>Fecha (más reciente)</span>
                </div>
                <div className="font-bold text-neutral">{latestFormattedDate}</div>
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-neutral/60 text-[11px]">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  <span>Total miembros</span>
                </div>
                <div className="font-bold text-neutral">{totalCombinedMembers} miembros</div>
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-neutral/60 text-[11px]">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span>Grupo</span>
                </div>
                <div className="font-bold text-neutral truncate" title={consolidatedGroupLabel}>
                  {consolidatedGroupLabel}
                </div>
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-neutral/60 text-[11px]">
                  <Award className="w-3.5 h-3.5 text-primary" />
                  <span>Reconocimiento</span>
                </div>
                <div className="font-bold text-neutral truncate" title={consolidatedRecLabel}>
                  {consolidatedRecLabel}
                </div>
              </div>
            </div>
          </div>

          {/* New Comment Field */}
          <div>
            <label htmlFor="merged-comment-input" className="block uppercase text-xs font-bold mb-1.5 tracking-wide text-neutral">
              Nuevo comentario para el lote fusionado
            </label>
            <textarea
              id="merged-comment-input"
              rows={3}
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Ej.: Lote fusionado correspondiente a las actividades conjuntas de distrito..."
              className="w-full rounded-field px-3 py-2 bg-white border border-primary/20 text-neutral text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-neutral/40"
              disabled={merging}
            />
            <p className="text-[11px] text-neutral/50 mt-1">
              Opcional. Este comentario identificará al nuevo lote consolidado.
            </p>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={merging}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={merging || selectedBatches.length < 2}
            icon={<GitMerge className="w-4 h-4" />}
          >
            {merging ? 'Fusionando lotes...' : 'Fusionar lotes'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

export default MergeBatchesModal;
