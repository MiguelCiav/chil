import React from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../../../components/Modal';
import { Button } from '../../../../components/Button';
import { ScoutMember, getUnitLabel } from '../../types';

export interface MemberQuickViewModalProps {
  member: ScoutMember | null;
  onClose: () => void;
}

export const MemberQuickViewModal: React.FC<MemberQuickViewModalProps> = ({
  member,
  onClose
}) => {
  return (
    <Modal isOpen={member !== null} onClose={onClose} className="max-w-md">
      <ModalHeader onClose={onClose}>Ficha del Miembro Scout</ModalHeader>
      {member && (
        <ModalBody className="space-y-4 font-sans text-neutral">
          <div className="bg-[#faf8f5] p-4 rounded-xl border border-gray-200 space-y-2.5 text-xs sm:text-sm">
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-neutral/50 font-semibold">Cédula de Identidad</span>
              <span className="font-mono font-bold text-neutral">{member.identity}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-neutral/50 font-semibold">Nombre Completo</span>
              <span className="font-bold text-neutral">
                {member.first_names} {member.last_names}
              </span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-neutral/50 font-semibold">Tipo</span>
              <span className="font-semibold text-neutral">
                {member.member_type === 'young' ? 'Joven' : 'Adulto'}
              </span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-neutral/50 font-semibold">Unidad</span>
              <span className="font-semibold text-neutral">{getUnitLabel(member.unit)}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-neutral/50 font-semibold">Estatus</span>
              <span
                className={`font-bold ${
                  member.status === 'active'
                    ? 'text-green-700'
                    : member.status === 'exceptional'
                    ? 'text-purple-700'
                    : 'text-red-700'
                }`}
              >
                {member.status === 'active'
                  ? '● Registro Válido'
                  : member.status === 'exceptional'
                  ? '● Emisión Excepcional'
                  : '● Registro Inválido'}
              </span>
            </div>
            {member.status === 'exceptional' && (
              <div className="flex flex-col border-b border-gray-200 pb-2 space-y-1 bg-purple-50/50 p-2.5 rounded-lg border border-purple-200/60">
                <span className="text-purple-900 font-bold text-xs">Justificación Excepcional</span>
                <span className="text-neutral text-xs italic break-words">
                  {member.exceptional_reason || 'Sin justificación especificada'}
                </span>
              </div>
            )}
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-neutral/50 font-semibold">Código de Reconocimiento</span>
              <span className="font-mono font-bold text-neutral">{member.recognition_code || '-'}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-neutral/50 font-semibold">Fecha Nacimiento</span>
              <span className="font-semibold text-neutral">{member.birth_date || '-'}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-neutral/50 font-semibold">Correo Electrónico</span>
              <span className="font-semibold text-neutral">{member.email || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral/50 font-semibold">Teléfono</span>
              <span className="font-semibold text-neutral">{member.phone || '-'}</span>
            </div>
          </div>
        </ModalBody>
      )}
      <ModalFooter>
        <Button variant="primary" onClick={onClose}>
          Cerrar
        </Button>
      </ModalFooter>
    </Modal>
  );
};
