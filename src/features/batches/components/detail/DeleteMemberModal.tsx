import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from '../../../../components';
import { MemberStatusBadge } from '../../../../domain/components';
import { ScoutMember } from '../../types';

export interface DeleteMemberModalProps {
  isOpen: boolean;
  member: ScoutMember | null;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export const DeleteMemberModal: React.FC<DeleteMemberModalProps> = ({
  isOpen,
  member,
  deleting,
  onClose,
  onConfirm
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
      <ModalHeader onClose={onClose}>
        <span className="flex items-center gap-2 text-red-700 font-bold">
          <AlertTriangle className="w-5 h-5" />
          Confirmar Eliminación de Miembro
        </span>
      </ModalHeader>
      <ModalBody className="space-y-4">
        {member && (
          <>
            <p className="text-sm text-neutral/80">
              ¿Estás seguro que deseas eliminar a{' '}
              <strong className="text-neutral">
                {member.first_names} {member.last_names}
              </strong>{' '}
              (<span className="font-mono">{member.identity}</span>) de este lote?
            </p>

            <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs">
              <span className="text-neutral/75 font-semibold">Estatus actual</span>
              <MemberStatusBadge
                status={member.status}
                solventUntil={
                  member.is_solvent || member.status === 'active'
                    ? member.solvent_until
                    : undefined
                }
              />
            </div>

            {member.recognition_code?.trim() && (
              <div
                role="alert"
                className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 font-medium"
              >
                Este miembro ya tiene un código de reconocimiento emitido ({member.recognition_code}). Eliminarlo retirará este registro del lote permanentemente.
              </div>
            )}
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose} disabled={deleting}>
          Cancelar
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={deleting || !member}>
          {deleting ? 'Eliminando...' : 'Eliminar Miembro'}
        </Button>
      </ModalFooter>
    </Modal>
  );
};
