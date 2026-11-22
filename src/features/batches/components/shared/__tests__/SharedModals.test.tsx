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

    it('renders correctly in batch object mode (with groupTokens)', () => {
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
        regionTokens: [{ kind: 'id', key: 'id:1', id: 1, label: 'Región Capital', count: 5 }],
        districtTokens: [{ kind: 'id', key: 'id:10', id: 10, label: 'Distrito Sucre', count: 5 }],
        groupTokens: [{ kind: 'id', key: 'id:100', id: 100, label: 'Grupo San Luis', count: 5 }],
        completenessStatus: 'complete',
        completenessLabel: 'Todos registrados',
        pendingCount: 0,
        eligibleCount: 5,
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

    it('omits group detail when batch.groupTokens resolves to No aplica and comment is empty', () => {
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
        regionTokens: [{ kind: 'none', key: '0', label: 'No aplica', count: 2 }],
        districtTokens: [{ kind: 'none', key: '0', label: 'No aplica', count: 2 }],
        groupTokens: [{ kind: 'none', key: '0', label: 'No aplica', count: 2 }],
        completenessStatus: 'pending',
        completenessLabel: 'Registros pendientes (2)',
        pendingCount: 2,
        eligibleCount: 0,
        recognitionName: 'Go Solar',
        recognitionType: 'sct-go-solar',
        memberCount: 2
      };

      render(<DeleteBatchModal {...defaultProps} batch={mockBatch} />);

      expect(screen.getByText('#102')).toBeInTheDocument();
      expect(screen.queryByText(/\(No aplica\)/)).not.toBeInTheDocument();
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

      // Change region to 2 (Región Central) -> district 10 is reset to 0 and group 100 to 0
      fireEvent.change(regionSelect, { target: { value: '2' } });
      expect(districtSelect).toHaveValue('0');
      expect(groupSelect).toHaveValue('0');

      fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            region_id: 2,
            district_id: 0,
            group_id: 0
          })
        );
      });
    });

    it('resets region_id, district_id, and group_id to explicit 0 when region is cleared to 0 and filters NO APLICA districts', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);

      render(
        <EditMemberModal
          isOpen={true}
          onClose={vi.fn()}
          member={mockMember}
          onSave={onSave}
          regions={mockRegions}
          districts={[
            ...mockDistricts,
            { id: 34, name: 'NO APLICA', region_id: 1 }
          ]}
          groups={mockGroups}
        />
      );

      const regionSelect = screen.getByLabelText(/Región Scout/i);
      const districtSelect = screen.getByLabelText(/Distrito Scout/i);

      // Positive-ID "NO APLICA" district should not appear as a duplicate option
      const districtOptions = Array.from(districtSelect.querySelectorAll('option')).map(
        (opt) => opt.textContent
      );
      expect(districtOptions).not.toContain('NO APLICA');

      fireEvent.change(regionSelect, { target: { value: '0' } });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            region_id: 0,
            district_id: 0,
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

    it('allows changing unit in wizard mode (manada -> tropa)', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const memberWithUnit: ScoutMember = {
        identity: 'V-55555555',
        first_names: 'Valeria',
        last_names: 'Lobezna',
        birth_date: '2015-06-01',
        member_type: 'young',
        unit: 'manada',
        status: 'active',
        batch_id: 123,
        recognition_code: 'REC-MAN-01',
        verified_in_registry: true
      };

      render(
        <EditMemberModal
          isOpen={true}
          onClose={vi.fn()}
          member={memberWithUnit}
          onSave={onSave}
          showContactFields={false}
        />
      );

      const unitSelect = screen.getByLabelText(/Unidad Scout \*/i);
      expect(unitSelect).toHaveValue('manada');

      fireEvent.change(unitSelect, { target: { value: 'tropa' } });
      expect(unitSelect).toHaveValue('tropa');

      fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            identity: 'V-55555555',
            unit: 'tropa'
          })
        );
      });
    });

    it('sets status to pending when changing unverified no_scout member to a scout unit', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const unverifiedNoScout: ScoutMember = {
        identity: 'V-77777777',
        first_names: 'Colaborador',
        last_names: 'Externo',
        birth_date: '1985-01-01',
        member_type: 'adult',
        unit: 'no_scout',
        status: 'active',
        verified_in_registry: false,
        batch_id: 123,
        recognition_code: 'REC-EXT-01'
      };

      render(
        <EditMemberModal
          isOpen={true}
          onClose={vi.fn()}
          member={unverifiedNoScout}
          onSave={onSave}
          showContactFields={false}
        />
      );

      const unitSelect = screen.getByLabelText(/Unidad Scout \*/i);
      expect(unitSelect).toHaveValue('no_scout');

      fireEvent.change(unitSelect, { target: { value: 'clan' } });

      await waitFor(() => {
        expect(
          screen.getByLabelText(/Autorizar emisión de reconocimiento \(Caso Excepcional\)/i)
        ).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            identity: 'V-77777777',
            unit: 'clan',
            status: 'pending'
          })
        );
      });
    });

    it('allows selecting Grupo Scout in wizard mode and saves with updated group_id', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const wizardMember: ScoutMember = {
        identity: 'V-11111111',
        first_names: 'Ana',
        last_names: 'Perez',
        birth_date: '2005-01-01',
        member_type: 'young',
        status: 'active',
        batch_id: 123,
        recognition_code: 'REC-A8F2'
      };
      const localGroups: ScoutGroup[] = [
        { id: 101, name: 'Grupo San Luis', district_id: 1 },
        { id: 102, name: 'Grupo La Salle', district_id: 1 }
      ];

      render(
        <EditMemberModal
          isOpen={true}
          onClose={vi.fn()}
          member={wizardMember}
          onSave={onSave}
          groups={localGroups}
          showContactFields={false}
        />
      );

      const groupSelect = screen.getByLabelText(/Grupo Scout/i);
      expect(groupSelect).toBeInTheDocument();

      fireEvent.change(groupSelect, { target: { value: '102' } });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            identity: 'V-11111111',
            group_id: 102
          })
        );
      });
    });

    it('allows selecting Region, District, and Group in wizard mode and saves updated hierarchy', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const wizardMember: ScoutMember = {
        identity: 'V-11111111',
        first_names: 'Ana',
        last_names: 'Perez',
        birth_date: '2005-01-01',
        member_type: 'young',
        status: 'active',
        batch_id: 123,
        recognition_code: 'REC-A8F2'
      };
      const localRegions: Region[] = [
        { id: 1, name: 'Región Capital' },
        { id: 2, name: 'Región Aragua' }
      ];
      const localDistricts: District[] = [
        { id: 10, name: 'Distrito Sucre', region_id: 1 },
        { id: 20, name: 'Distrito Girardot', region_id: 2 }
      ];
      const localGroups: ScoutGroup[] = [
        { id: 101, name: 'Grupo San Luis', district_id: 10 },
        { id: 201, name: 'Grupo Maracay', district_id: 20 }
      ];

      render(
        <EditMemberModal
          isOpen={true}
          onClose={vi.fn()}
          member={wizardMember}
          onSave={onSave}
          regions={localRegions}
          districts={localDistricts}
          groups={localGroups}
          showContactFields={false}
        />
      );

      const regionSelect = screen.getByLabelText(/Región Scout/i);
      const districtSelect = screen.getByLabelText(/Distrito Scout/i);
      const groupSelect = screen.getByLabelText(/Grupo Scout/i);

      expect(regionSelect).toBeInTheDocument();
      expect(districtSelect).toBeInTheDocument();
      expect(groupSelect).toBeInTheDocument();

      fireEvent.change(regionSelect, { target: { value: '2' } });
      fireEvent.change(districtSelect, { target: { value: '20' } });
      fireEvent.change(groupSelect, { target: { value: '201' } });

      fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            identity: 'V-11111111',
            region_id: 2,
            district_id: 20,
            group_id: 201
          })
        );
      });
    });
  });
});
