import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { Field } from '../../../components/Field';
import {
  RecognitionType,
  RecognitionFormData,
  recognitionFormSchema
} from '../types';
import { createRecognitionType, updateRecognitionType } from '../api';
import { useAuth } from '../../auth';

interface RecognitionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  recognition?: RecognitionType | null;
  onSuccess: (saved: RecognitionType, isEdit: boolean) => void;
}

export const RecognitionFormModal: React.FC<RecognitionFormModalProps> = ({
  isOpen,
  onClose,
  recognition,
  onSuccess
}) => {
  const { user } = useAuth();
  const isEdit = Boolean(recognition);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<RecognitionFormData>({
    resolver: zodResolver(recognitionFormSchema),
    defaultValues: {
      name: ''
    }
  });

  const handleClose = () => {
    if (!loading) {
      setErrorMsg(null);
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (recognition) {
        reset({
          name: recognition.name
        });
      } else {
        reset({
          name: ''
        });
      }
    }
  }, [isOpen, recognition, reset]);

  const onSubmit = async (data: RecognitionFormData) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      if (isEdit && recognition) {
        const updated = await updateRecognitionType(
          recognition.id,
          {
            name: data.name
          },
          user?.uid
        );
        onSuccess(updated, true);
      } else {
        const created = await createRecognitionType(
          {
            name: data.name
          },
          user?.uid
        );
        onSuccess(created, false);
      }
      onClose();
    } catch (err) {
      console.error('Error saving recognition type:', err);
      setErrorMsg('Ocurrió un error al guardar el reconocimiento. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-lg">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col flex-1 overflow-hidden min-h-0">
        <ModalHeader onClose={handleClose}>
          {isEdit ? 'Editar Tipo de Reconocimiento' : 'Nuevo Tipo de Reconocimiento'}
        </ModalHeader>
        <ModalBody className="space-y-4">
          {errorMsg && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
              {errorMsg}
            </div>
          )}

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
            {loading ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Reconocimiento'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
