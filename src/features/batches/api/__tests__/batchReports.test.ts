import { describe, it, expect, vi, beforeEach } from 'vitest';
import { jsPDF } from 'jspdf';
import { Batch, District, Region, ScoutGroup, ScoutMember } from '../../types';
import { generateBatchReport, resolveBatchReportBuckets } from '../batchReports';

const mockDocInstance = {
  setFontSize: vi.fn(),
  setTextColor: vi.fn(),
  text: vi.fn(),
  setDrawColor: vi.fn(),
  line: vi.fn(),
  setFont: vi.fn(),
  setFillColor: vi.fn(),
  rect: vi.fn(),
  addPage: vi.fn(),
  save: vi.fn(),
  splitTextToSize: vi.fn((text: string, _maxWidth: number) => [text])
};

vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(function () {
    return mockDocInstance;
  })
}));

vi.mock('../batchesCrud', () => ({
  getBatchById: vi.fn()
}));

vi.mock('../membersCrud', () => ({
  getMembersByBatchId: vi.fn()
}));

vi.mock('../hierarchyApi', () => ({
  getHierarchyData: vi.fn()
}));

const regions: Region[] = [
  { id: 0, name: 'No aplica' },
  { id: 1, name: 'Región Metropolitana' },
  { id: 2, name: 'Región Central' }
];

const districts: District[] = [
  { id: 0, name: 'No aplica', region_id: 0 },
  { id: 10, name: 'Distrito Ávila', region_id: 1 },
  { id: 20, name: 'Distrito Valencia', region_id: 2 }
];

const groups: ScoutGroup[] = [
  { id: 0, name: 'No aplica', district_id: 0 },
  { id: 100, name: 'Grupo Zamora', district_id: 10 },
  { id: 200, name: 'Grupo Águilas', district_id: 20 }
];

const hierarchy = { regions, districts, groups };

const baseBatch: Batch = {
  id: 42,
  comment: 'Lote de prueba',
  region_id: 0,
  district_id: 0,
  group_id: 0,
  created_at: '2026-05-01T12:00:00.000Z'
};

function makeMember(overrides: Partial<ScoutMember>): ScoutMember {
  return {
    identity: 'V10000001',
    first_names: 'Ana',
    last_names: 'Pérez',
    birth_date: '2000-01-01',
    member_type: 'adult',
    status: 'active',
    unit: 'institucional',
    ...overrides
  };
}

describe('batchReports service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDocInstance.splitTextToSize.mockImplementation((text: string) => [text]);
  });

  describe('resolveBatchReportBuckets', () => {
    it('routes no_scout members to Miembros no scout ignoring member and batch group_id', () => {
      const batchWithGroup: Batch = { ...baseBatch, group_id: 100 };
      const members = [
        makeMember({ identity: 'V1', unit: 'no_scout', group_id: 200, status: 'exceptional' }),
        makeMember({ identity: 'V2', unit: 'manada', group_id: 200 })
      ];

      const buckets = resolveBatchReportBuckets(batchWithGroup, members, hierarchy);
      expect(buckets.map((b) => b.key)).toEqual(['group:200', 'special:no_scout']);
      expect(buckets[1]).toMatchObject({
        kind: 'no_scout',
        label: 'Miembros no scout',
        districtName: null,
        regionName: null
      });
      expect(buckets[1].members.map((m) => m.identity)).toEqual(['V1']);
    });

    it('uses m.group_id over batch.group_id and ignores synthetic hierarchy id 0', () => {
      const batchWithGroup: Batch = { ...baseBatch, group_id: 100 };
      const members = [
        makeMember({ identity: 'V1', group_id: undefined }),
        makeMember({ identity: 'V2', group_id: 200 })
      ];

      const buckets = resolveBatchReportBuckets(batchWithGroup, members, hierarchy);
      expect(buckets.map((b) => b.key)).toEqual(['group:200', 'group:100']);
      expect(buckets[0]).toMatchObject({
        label: 'Grupo Águilas',
        districtName: 'Distrito Valencia',
        regionName: 'Región Central'
      });
      expect(buckets[1]).toMatchObject({
        label: 'Grupo Zamora',
        districtName: 'Distrito Ávila',
        regionName: 'Región Metropolitana'
      });
    });

    it('routes group_id 0 to Sin grupo asignado without console.warn', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const batchWithGroup: Batch = { ...baseBatch, group_id: 100 };
      const members = [
        makeMember({ identity: 'V1', group_id: 0, status: 'pending' }),
        makeMember({ identity: 'V2', group_id: undefined })
      ];

      const buckets = resolveBatchReportBuckets(batchWithGroup, members, {
        ...hierarchy,
        groups: [{ id: 0, name: 'No aplica', district_id: 0 }, ...groups.slice(1)]
      });

      expect(buckets.map((b) => b.key)).toEqual(['group:100', 'special:ungrouped']);
      expect(buckets[1].label).toBe('Sin grupo asignado');
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('warns and routes unresolved positive group_id to Sin grupo asignado', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const members = [makeMember({ identity: 'V99', group_id: 999 })];

      const buckets = resolveBatchReportBuckets(baseBatch, members, hierarchy);
      expect(buckets).toHaveLength(1);
      expect(buckets[0].key).toBe('special:ungrouped');
      expect(warnSpy).toHaveBeenCalledTimes(1);
      warnSpy.mockRestore();
    });

    it('falls back to No aplica when parent district or region is missing', () => {
      const orphanGroup: ScoutGroup = { id: 300, name: 'Grupo Sin Distrito', district_id: 999 };
      const members = [makeMember({ identity: 'V3', group_id: 300 })];

      const buckets = resolveBatchReportBuckets(baseBatch, members, {
        regions,
        districts,
        groups: [...groups, orphanGroup]
      });

      expect(buckets[0]).toMatchObject({
        label: 'Grupo Sin Distrito',
        districtName: 'No aplica',
        regionName: 'No aplica'
      });
    });

    it('keeps active, exceptional, and pending members in their assigned groups and sorts groups + members', () => {
      const members = [
        makeMember({ identity: 'V20', first_names: 'Carlos', last_names: 'Bello', group_id: 100, status: 'pending' }),
        makeMember({ identity: 'V10', first_names: 'Carlos', last_names: 'Bello', group_id: 100, status: 'exceptional' }),
        makeMember({ identity: 'V30', first_names: 'Beatriz', last_names: 'Alvarado', group_id: 200, status: 'active' }),
        makeMember({ identity: '', first_names: '', last_names: '', group_id: 0 }),
        makeMember({ identity: 'V40', unit: 'no_scout' })
      ];

      const buckets = resolveBatchReportBuckets(baseBatch, members, hierarchy);
      expect(buckets.map((b) => b.key)).toEqual([
        'group:200',
        'group:100',
        'special:no_scout',
        'special:ungrouped'
      ]);
      expect(buckets[1].members.map((m) => m.identity)).toEqual(['V10', 'V20']);
    });
  });

  describe('generateBatchReport', () => {
    it('throws before instantiating jsPDF when batch has no members', async () => {
      await expect(generateBatchReport(baseBatch, [], hierarchy)).rejects.toThrow(
        'No hay miembros en este lote para generar el reporte.'
      );
      expect(jsPDF).not.toHaveBeenCalled();
    });

    it('throws explicit error when scoped bucketKey has no members', async () => {
      const members = [makeMember({ identity: 'V1', group_id: 100 })];

      await expect(
        generateBatchReport(baseBatch, members, hierarchy, { bucketKey: 'group:200' })
      ).rejects.toThrow('El grupo seleccionado no tiene miembros en este lote.');
      expect(jsPDF).not.toHaveBeenCalled();
    });

    it('renders uniform header, 4-metric summary, continuous group sections without Grupo column, and wraps long names/comments', async () => {
      mockDocInstance.splitTextToSize.mockImplementation((text: string, maxWidth: number) => {
        if (text.startsWith('Comentario:')) {
          return ['Comentario: Primera línea muy larga', 'Segunda línea de comentario', 'Tercera línea'];
        }
        if (maxWidth === 82 && text.includes('Nombre Sumamente Largo')) {
          return ['María Alejandra De Todos Los', 'Santos Nombre Sumamente Largo'];
        }
        return [text];
      });

      const members = [
        makeMember({
          identity: 'V101',
          first_names: 'María Alejandra De Todos Los',
          last_names: 'Santos Nombre Sumamente Largo',
          group_id: 100,
          status: 'active',
          member_type: 'adult'
        }),
        makeMember({
          identity: 'V102',
          first_names: 'Luis',
          last_names: 'Gómez',
          group_id: 100,
          status: 'exceptional',
          member_type: 'young'
        }),
        makeMember({
          identity: 'V103',
          first_names: 'Pedro',
          last_names: 'Rojas',
          unit: 'no_scout',
          status: 'pending'
        })
      ];

      const fileName = await generateBatchReport(baseBatch, members, hierarchy);

      expect(fileName).toBe('Reporte_Lote_42.pdf');
      expect(mockDocInstance.save).toHaveBeenCalledWith('Reporte_Lote_42.pdf');

      const textCalls = mockDocInstance.text.mock.calls;
      const flatText = textCalls.flatMap(([arg]) => (Array.isArray(arg) ? arg : [arg]));

      expect(flatText).not.toContain('Región: Región Metropolitana');
      expect(flatText).not.toContain('Grupo');
      expect(flatText).toContain('Alcance: Todos los grupos (2)');
      expect(flatText).toContain('Comentario: Primera línea muy larga');
      expect(flatText).toContain('Total: 3');
      expect(flatText).toContain('Activos (Válidos): 1');
      expect(flatText).toContain('Excepcionales: 1');
      expect(flatText).toContain('Pendientes: 1');
      expect(flatText).toContain('Grupo Zamora (2)');
      expect(flatText).toContain('Distrito: Distrito Ávila  |  Región: Región Metropolitana');
      expect(flatText).toContain('Miembros no scout (1)');
      expect(flatText).toContain('Santos Nombre Sumamente Largo');

      // Check Tipo at x=132 and Estado at x=156
      expect(textCalls).toContainEqual(['Tipo', 132, expect.any(Number)]);
      expect(textCalls).toContainEqual(['Estado', 156, expect.any(Number)]);
      expect(textCalls).toContainEqual(['Emisión Excepcional', 156, expect.any(Number)]);
    });

    it('renders scoped single-bucket export with sliced summary metrics and sanitized lowercase filename', async () => {
      const accentedGroup: ScoutGroup = {
        id: 250,
        name: 'Grupo Ñandú / #1!',
        district_id: 10
      };
      const members = [
        makeMember({ identity: 'V1', group_id: 100, status: 'active' }),
        makeMember({ identity: 'V2', group_id: 250, status: 'exceptional' })
      ];

      const fileName = await generateBatchReport(
        baseBatch,
        members,
        { regions, districts, groups: [...groups, accentedGroup] },
        { bucketKey: 'group:250' }
      );

      expect(fileName).toBe('Reporte_Lote_42_grupo_nandu_1.pdf');
      expect(mockDocInstance.save).toHaveBeenCalledWith('Reporte_Lote_42_grupo_nandu_1.pdf');

      const flatText = mockDocInstance.text.mock.calls.flatMap(([arg]) =>
        Array.isArray(arg) ? arg : [arg]
      );
      expect(flatText).toContain('Alcance: Grupo Ñandú / #1!');
      expect(flatText).toContain('Total: 1');
      expect(flatText).toContain('Activos (Válidos): 0');
      expect(flatText).toContain('Excepcionales: 1');
      expect(flatText).not.toContain('Grupo Zamora (1)');
    });

    it('falls back to "grupo" slug when sanitized bucket label has no alphanumeric characters', async () => {
      const symbolGroup: ScoutGroup = { id: 251, name: '***', district_id: 10 };
      const members = [makeMember({ identity: 'V1', group_id: 251 })];

      const fileName = await generateBatchReport(
        baseBatch,
        members,
        { regions, districts, groups: [...groups, symbolGroup] },
        { bucketKey: 'group:251' }
      );

      expect(fileName).toBe('Reporte_Lote_42_grupo.pdf');
    });

    it('adds pages with continuation headers on mid-section overflow and guards orphaned section headers', async () => {
      // 30 members across two groups guarantees mid-section overflow across A4 page bounds
      const members: ScoutMember[] = [
        ...Array.from({ length: 24 }, (_, idx) =>
          makeMember({
            identity: `V${String(idx + 1).padStart(3, '0')}`,
            first_names: `Miembro`,
            last_names: `Alfa ${String(idx + 1).padStart(2, '0')}`,
            group_id: 200
          })
        ),
        ...Array.from({ length: 6 }, (_, idx) =>
          makeMember({
            identity: `Z${String(idx + 1).padStart(3, '0')}`,
            first_names: `Miembro`,
            last_names: `Zulu ${String(idx + 1).padStart(2, '0')}`,
            group_id: 100
          })
        )
      ];

      await generateBatchReport(baseBatch, members, hierarchy);

      expect(mockDocInstance.addPage).toHaveBeenCalled();

      const textCalls = mockDocInstance.text.mock.calls;
      const flatText = textCalls.map(([arg]) => (Array.isArray(arg) ? arg.join(' ') : arg));

      expect(flatText).toContain('Grupo Águilas (Continuación)');
      // Table headers are redrawn after continuation header (more than initial 2 sections)
      const cedulaHeaderCalls = textCalls.filter(([label]) => label === 'Cédula');
      expect(cedulaHeaderCalls.length).toBeGreaterThanOrEqual(3);
    });

    it('pushes next group section header to a fresh page rather than orphaning it near page bottom', async () => {
      // 18 rows in group:200 leaves y at 268mm, forcing group:100 (needs 29mm) onto page 2 cleanly
      const members: ScoutMember[] = [
        ...Array.from({ length: 18 }, (_, idx) =>
          makeMember({
            identity: `A${String(idx + 1).padStart(3, '0')}`,
            first_names: 'Miembro',
            last_names: `Uno ${String(idx + 1).padStart(2, '0')}`,
            group_id: 200
          })
        ),
        makeMember({
          identity: 'Z001',
          first_names: 'Carlos',
          last_names: 'Zamora',
          group_id: 100
        })
      ];

      await generateBatchReport(baseBatch, members, hierarchy);

      expect(mockDocInstance.addPage).toHaveBeenCalledTimes(1);
      const textCalls = mockDocInstance.text.mock.calls;
      const zamoraCall = textCalls.find(([label]) => label === 'Grupo Zamora (1)');
      expect(zamoraCall).toEqual(['Grupo Zamora (1)', 14, 20]);
      const flatText = textCalls.map(([arg]) => (Array.isArray(arg) ? arg.join(' ') : arg));
      expect(flatText).not.toContain('Grupo Zamora (Continuación)');
    });
  });
});
