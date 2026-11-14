import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteBatchModal, EditMemberModal } from '../index';
import { BatchRowData } from '../../list/types';
import { ScoutMember, Region, District, ScoutGroup } from '../../../types';

describe('Shared Modals (DeleteBatchModal & EditMemberModal)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DeleteBatchModal', () => {
    const defaultProps = {
      isOpen: true,
      onClose: vi.fn(),
      onConfirm: vi.fn(),
      deleting: false
    };

    it('renders correctly in batch object mode (with groupName)', () => {
      const mockBatch: BatchRowData = {
        id: 101,
        batch: {
          id: 101,
          region_id: 1,
          district_id: 10,
          group_id: 100,
          created_at: '2026-08-20T10:00:00.000Z'
        },
        created_at: '2026-08-20T10:00:00.000Z',
        formattedDate: '20 Ago 2026',
        regionName: 'Región Capital',
        districtName: 'Distrito Sucre',
        groupName: 'Grupo San Luis',
        recognitionName: 'Go Solar',
        recognitionType: 'sct-go-solar',
        memberCount: 5
      };

      render(<DeleteBatchModal {...defaultProps} batch={mockBatch} />);

      expect(screen.getByText('#101')).toBeInTheDocument();
      expect(screen.getByText(/\(\s*Grupo San Luis\s*\)/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Eliminar Lote' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeEnabled();
    });

    it('omits group detail when batch.groupName is "-"', () => {
      const mockBatch: BatchRowData = {
        id: 102,
        batch: {
          id: 102,
          region_id: 0,
          district_id: 0,
          group_id: 0,
          created_at: '2026-08-20T10:00:00.000Z'
        },
        created_at: '2026-08-20T10:00:00.000Z',
        formattedDate: '20 Ago 2026',
        regionName: '-',
        districtName: '-',
        groupName: '-',
        recognitionName: 'Go Solar',
        recognitionType: 'sct-go-solar',
        memberCount: 2
      };

      render(<DeleteBatchModal {...defaultProps} batch={mockBatch} />);

      expect(screen.getByText('#102')).toBeInTheDocument();
      expect(screen.queryByText(/\(-\)/)).not.toBeInTheDocument();
    });

    it('renders correctly in batchId / batchComment props mode', () => {
      render(
        <DeleteBatchModal
          {...defaultProps}
          batchId={555}
          batchComment="Lote Especial Aniversario"
        />
      );

      expect(screen.getByText('#555')).toBeInTheDocument();
      expect(screen.getByText(/\(Lote Especial Aniversario\)/)).toBeInTheDocument();
    });

    it('disables buttons and prevents closing while deleting is true', () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();

      render(
        <DeleteBatchModal
          isOpen={true}
          onClose={onClose}
          onConfirm={onConfirm}
          deleting={true}
          batchId={777}
        />
      );

      const deleteBtn = screen.getByRole('button', { name: 'Eliminando...' });
      const cancelBtn = screen.getByRole('button', { name: 'Cancelar' });

      expect(deleteBtn).toBeDisabled();
      expect(cancelBtn).toBeDisabled();
    });

    it('calls onConfirm and onClose when buttons are clicked', () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();

      render(
        <DeleteBatchModal
          isOpen={true}
          onClose={onClose}
          onConfirm={onConfirm}
          deleting={false}
          batchId={888}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      expect(onClose).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: 'Eliminar Lote' }));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('EditMemberModal', () => {
    const mockMember: ScoutMember = {
      identity: 'V-12345678',
      first_names: 'Carlos',
      last_names: 'Gomez',
      birth_date: '2004-05-10',
      email: 'carlos@scouts.org',
      phone: '04141112233',
      member_type: 'young',
      unit: 'tropa',
      status: 'pending',
      batch_id: 101,
      region_id: 1,
      district_id: 10,
      group_id: 100
    };

    const mockRegions: Region[] = [
      { id: 0, name: 'No aplica' },
      { id: 1, name: 'Región Capital' },
      { id: 2, name: 'Región Central' }
    ];

    const mockDistricts: District[] = [
      { id: 0, name: 'No aplica', region_id: 0 },
      { id: 10, name: 'Distrito Sucre', region_id: 1 },
      { id: 20, name: 'Distrito Valencia', region_id: 2 }
    ];

    const mockGroups: ScoutGroup[] = [
      { id: 0, name: 'No aplica', district_id: 0 },
      { id: 100, name: 'Grupo San Luis', district_id: 10 },
      { id: 200, name: 'Grupo Cabriales', district_id: 20 }
    ];

    it('renders contact fields when showContactFields is true (default) and hides them when false', () => {
      const { rerender } = render(
        <EditMemberModal
          isOpen={true}
          onClose={vi.fn()}
          member={mockMember}
          onSave={vi.fn()}
          showContactFields={true}
        />
      );

      expect(screen.getByLabelText(/Fecha de Nacimiento \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Correo Electrónico/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Teléfono de Contacto/i)).toBeInTheDocument();

      rerender(
        <EditMemberModal
          isOpen={true}
          onClose={vi.fn()}
          member={mockMember}
          onSave={vi.fn()}
          showContactFields={false}
        />
      );

      expect(screen.queryByLabelText(/Fecha de Nacimiento \*/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Correo Electrónico/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Teléfono de Contacto/i)).not.toBeInTheDocument();
    });

    it('validates exceptional emission reason and alerts if empty on submit', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const onSave = vi.fn().mockResolvedValue(undefined);

      render(
        <EditMemberModal
          isOpen={true}
          onClose={vi.fn()}
          member={mockMember}
          onSave={onSave}
        />
      );

      const toggle = screen.getByLabelText(/Autorizar emisión de reconocimiento \(Caso Excepcional\)/i);
      fireEvent.click(toggle);

      const reasonTextarea = screen.getByLabelText(/Justificación de la emisión excepcional/i);
      fireEvent.change(reasonTextarea, { target: { value: '   ' } });

      // Submit form directly
      const form = reasonTextarea.closest('form')!;
      fireEvent.submit(form);

      expect(alertSpy).toHaveBeenCalledWith(
        'Debe ingresar una justificación para la emisión excepcional.'
      );
      expect(onSave).not.toHaveBeenCalled();

      // Now enter valid reason
      fireEvent.change(reasonTextarea, { target: { value: 'Autorizado por Comisionado Nacional' } });
      fireEvent.submit(form);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'exceptional',
            exceptional_reason: 'Autorizado por Comisionado Nacional',
            recognition_code: 'REC-5678'
          })
        );
      });

      alertSpy.mockRestore();
    });

    it('resets incompatible district and group when region changes', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);

      render(
        <EditMemberModal
          isOpen={true}
          onClose={vi.fn()}
          member={mockMember}
          onSave={onSave}
          regions={mockRegions}
          districts={mockDistricts}
          groups={mockGroups}
        />
      );

      const regionSelect = screen.getByLabelText(/Región Scout/i);
      const districtSelect = screen.getByLabelText(/Distrito Scout/i);
      const groupSelect = screen.getByLabelText(/Grupo Scout/i);

      expect(regionSelect).toHaveValue('1');
      expect(districtSelect).toHaveValue('10');
      expect(groupSelect).toHaveValue('100');

      // Change region to 2 (Región Central) -> district 10 is reset to undefined and group 100 to 0
      fireEvent.change(regionSelect, { target: { value: '2' } });
      expect(districtSelect).toHaveValue('0');
      expect(groupSelect).toHaveValue('0');

      fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            region_id: 2,
            district_id: undefined,
            group_id: 0
          })
        );
      });
    });

    it('persists group_id: 0 when clearing the group dropdown directly', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);

      render(
        <EditMemberModal
          isOpen={true}
          onClose={vi.fn()}
          member={mockMember}
          onSave={onSave}
          regions={mockRegions}
          districts={mockDistricts}
          groups={mockGroups}
        />
      );

      const groupSelect = screen.getByLabelText(/Grupo Scout/i);
      expect(groupSelect).toHaveValue('100');

      fireEvent.change(groupSelect, { target: { value: '0' } });
      expect(groupSelect).toHaveValue('0');

      fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            group_id: 0
          })
        );
      });
    });

    it('uppercases recognition code when showContactFields is false (wizard mode)', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);

      render(
        <EditMemberModal
          isOpen={true}
          onClose={vi.fn()}
          member={{ ...mockMember, status: 'active' }}
          onSave={onSave}
          showContactFields={false}
        />
      );

      const codeInput = screen.getByLabelText(/Código de Reconocimiento/i);
      fireEvent.change(codeInput, { target: { value: 'rec-abc99' } });
      expect(codeInput).toHaveValue('REC-ABC99');

      fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            recognition_code: 'REC-ABC99'
          })
        );
      });
    });
  });
});
