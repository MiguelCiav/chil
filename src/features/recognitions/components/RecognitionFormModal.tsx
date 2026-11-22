import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Field,
  ErrorAlert
} from '../../../components';
import {
  RecognitionType,
  RecognitionFormData,
  recognitionFormSchema
} from '../types';
import { createRecognitionType, updateRecognitionType } from '../api';
import { useAuth } from '../../auth';

export interface RecognitionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  recognition?: RecognitionType | null;
  onSuccess?: (saved: RecognitionType, isEdit?: boolean) => void;
  onCreateSuccess?: (saved: RecognitionType) => void;
  onEditSuccess?: (saved: RecognitionType) => void;
}

function getSubmitButtonText(loading: boolean, isEdit: boolean): string {
  if (loading) return 'Guardando...';
  if (isEdit) return 'Guardar Cambios';
  return 'Crear Reconocimiento';
}

interface RecognitionFormContentProps {
  onClose: () => void;
  recognition?: RecognitionType | null;
  loading: boolean;
  onLoadingChange: (loading: boolean) => void;
  onSuccess?: (saved: RecognitionType, isEdit?: boolean) => void;
  onCreateSuccess?: (saved: RecognitionType) => void;
  onEditSuccess?: (saved: RecognitionType) => void;
}

const RecognitionFormContent: React.FC<RecognitionFormContentProps> = ({
  onClose,
  recognition,
  loading,
  onLoadingChange,
  onSuccess,
  onCreateSuccess,
  onEditSuccess
}) => {
  const { user } = useAuth();
  const isEdit = Boolean(recognition);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<RecognitionFormData>({
    resolver: zodResolver(recognitionFormSchema),
    defaultValues: {
      name: recognition?.name ?? ''
    }
  });

  const handleClose = () => {
    if (!loading) {
      setErrorMsg(null);
      reset({ name: recognition?.name ?? '' });
      onClose();
    }
  };

  const onSubmit = async (data: RecognitionFormData) => {
    onLoadingChange(true);
    setErrorMsg(null);
    try {
      if (recognition) {
        const updated = await updateRecognitionType(
          recognition.id,
          {
            name: data.name
          },
          user?.uid
        );
        onEditSuccess?.(updated);
        onSuccess?.(updated, true);
      } else {
        const created = await createRecognitionType(
          {
            name: data.name
          },
          user?.uid
        );
        onCreateSuccess?.(created);
        onSuccess?.(created, false);
      }
      reset({ name: '' });
      onClose();
    } catch (err) {
      console.error('Error saving recognition type:', err);
      setErrorMsg('Ocurrió un error al guardar el reconocimiento. Intente nuevamente.');
    } finally {
      onLoadingChange(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col flex-1 overflow-hidden min-h-0"
    >
      <ModalHeader onClose={handleClose}>
        {isEdit ? 'Editar Tipo de Reconocimiento' : 'Nuevo Tipo de Reconocimiento'}
      </ModalHeader>
      <ModalBody className="space-y-4">
        {errorMsg && <ErrorAlert variant="compact" message={errorMsg} />}

        {/* Nombre Field */}
        <div>
          <Field
            label="Nombre *"
            placeholder="Ej. Medalla al Mérito Scout"
            disabled={loading}
            variant={errors.name ? 'error' : 'default'}
            errorText={errors.name?.message}
            {...register('name')}
          />
        </div>
      </ModalBody>

      <ModalFooter>
        <Button
          type="button"
          variant="outline"
          onClick={handleClose}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={loading}
        >
          {getSubmitButtonText(loading, isEdit)}
        </Button>
      </ModalFooter>
    </form>
  );
};

export const RecognitionFormModal: React.FC<RecognitionFormModalProps> = ({
  isOpen,
  onClose,
  recognition,
  onSuccess,
  onCreateSuccess,
  onEditSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const formKey = `${isOpen ? 'open' : 'closed'}-${recognition?.id ?? 'create'}-${recognition?.name ?? ''}`;

  return (
    <Modal isOpen={isOpen} onClose={() => !loading && onClose()} className="max-w-lg">
      <RecognitionFormContent
        key={formKey}
        onClose={onClose}
        recognition={recognition}
        loading={loading}
        onLoadingChange={setLoading}
        onSuccess={onSuccess}
        onCreateSuccess={onCreateSuccess}
        onEditSuccess={onEditSuccess}
      />
    </Modal>
  );
};
