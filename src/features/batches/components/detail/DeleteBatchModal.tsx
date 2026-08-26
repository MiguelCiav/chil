import React from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../../components/Modal';
import { Button } from '../../../../components/Button';

export interface DeleteBatchModalProps {
  isOpen: boolean;
  batchId: number;
  batchComment?: string;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteBatchModal: React.FC<DeleteBatchModalProps> = ({
  isOpen,
  batchId,
  batchComment,
  deleting,
  onClose,
  onConfirm
}) => {
  return (
    <Modal isOpen={isOpen} onClose={() => !deleting && onClose()} className="max-w-md">
      <ModalHeader onClose={() => !deleting && onClose()}>Eliminar Lote</ModalHeader>
      <ModalBody className="space-y-3">
        <p className="text-sm text-neutral">
          ¿Está seguro de que desea eliminar el lote <span className="font-bold">#{batchId}</span>
          {batchComment ? ` (${batchComment})` : ''} y todos sus miembros asociados?
        </p>
        <p className="text-xs text-red-600 font-semibold bg-red-50 p-2.5 rounded-lg border border-red-200">
          Esta acción no se puede deshacer y eliminará permanentemente los datos del lote y sus
          registros de miembros asociados.
        </p>
      </ModalBody>
      <ModalFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={deleting}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={deleting}
          className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
        >
          {deleting ? 'Eliminando...' : 'Eliminar Lote'}
        </Button>
      </ModalFooter>
    </Modal>
  );
};
