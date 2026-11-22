import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  ErrorAlert
} from '../../../components';
import { RecognitionType } from '../types';
import { deleteRecognitionType } from '../api';

interface RecognitionDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  recognition: RecognitionType | null;
  onSuccess: (deletedId: string) => void;
}

export const RecognitionDeleteModal: React.FC<RecognitionDeleteModalProps> = ({
  isOpen,
  onClose,
  recognition,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!recognition) return null;

  const handleDelete = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await deleteRecognitionType(recognition.id);
      onSuccess(recognition.id);
      onClose();
    } catch (err) {
      console.error('Error deleting recognition type:', err);
      setErrorMsg('Ocurrió un error al eliminar el reconocimiento. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => !loading && onClose()} className="max-w-md">
      <ModalHeader onClose={() => !loading && onClose()}>
        Eliminar Tipo de Reconocimiento
      </ModalHeader>
      <ModalBody className="space-y-4">
        {errorMsg && <ErrorAlert variant="compact" message={errorMsg} />}

        <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-200 text-red-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold mb-1">¿Está seguro de que desea eliminar este reconocimiento?</p>
            <p className="text-xs text-red-700">
              Se eliminará <span className="font-bold">{recognition.name}</span> del catálogo general. Esta acción no se puede deshacer.
            </p>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={handleDelete}
          disabled={loading}
        >
          {loading ? 'Eliminando...' : 'Eliminar Reconocimiento'}
        </Button>
      </ModalFooter>
    </Modal>
  );
};
