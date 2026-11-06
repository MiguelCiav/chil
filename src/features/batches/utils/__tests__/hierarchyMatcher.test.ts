import { describe, it, expect } from 'vitest';
import {
  normalizeScoutName,
  matchHierarchy,
  classifyScoutUnitAndType
} from '../hierarchyMatcher';

describe('hierarchyMatcher', () => {
  describe('normalizeScoutName', () => {
    it('normalizes string removing accents, special characters, and extra spaces', () => {
      expect(normalizeScoutName('  Región   Ávila - San Luis!  ')).toBe('REGION AVILA SAN LUIS');
      expect(normalizeScoutName('MÉRIDA (Distrito)')).toBe('MERIDA DISTRITO');
      expect(normalizeScoutName('')).toBe('');
      expect(normalizeScoutName(undefined)).toBe('');
    });
  });

  describe('matchHierarchy', () => {
    it('matches exact region, district, and group from hierarchy.json', () => {
      const result = matchHierarchy('DISTRITO CAPITAL', 'AVILA', 'DON BOSCO 21');
      expect(result.region_id).toBe(5);
      expect(result.region_name).toBe('DISTRITO CAPITAL');
      expect(result.district_id).toBe(21);
      expect(result.district_name).toBe('AVILA');
      expect(result.group_id).toBe(64);
      expect(result.group_name).toBe('DON BOSCO 21');
    });

    it('matches entities using their Impeesa UUIDs', () => {
      const result = matchHierarchy(
        '9ed1879c-2b40-4f5e-877c-0f2755d0f89b',
        '58d2c5c6-3306-41b4-9dfe-68a399a80e6d',
        '8fb3a56e-e733-4e34-8b44-6c00a58843fc'
      );
      expect(result.region_id).toBe(5);
      expect(result.region_name).toBe('DISTRITO CAPITAL');
      expect(result.district_id).toBe(21);
      expect(result.district_name).toBe('AVILA');
      expect(result.group_id).toBe(62);
      expect(result.group_name).toBe('ARISTIDES ROJAS');
    });

    it('matches groups in reorganized districts such as ATENDIDOS POR LA REGION', () => {
      const result = matchHierarchy('ARAGUA', 'ATENDIDOS POR LA REGION', 'INDEPENDENCIA GUARICO');
      expect(result.region_id).toBe(2);
      expect(result.region_name).toBe('ARAGUA');
      expect(result.district_id).toBe(52);
      expect(result.district_name).toBe('ATENDIDOS POR LA REGION');
      expect(result.group_id).toBe(180);
      expect(result.group_name).toBe('INDEPENDENCIA GUARICO');
    });

    it('matches case-insensitively with accents', () => {
      const result = matchHierarchy('distrito capital', 'ÁVILA', 'don bosco 21');
      expect(result.region_id).toBe(5);
      expect(result.district_id).toBe(21);
      expect(result.group_id).toBe(64);
    });

    it('matches group by substring inside district', () => {
      const result = matchHierarchy('DISTRITO CAPITAL', 'AVILA', 'DON BOSCO');
      expect(result.region_id).toBe(5);
      expect(result.district_id).toBe(21);
      expect(result.group_id).toBe(64);
      expect(result.group_name).toBe('DON BOSCO 21');
    });

    it('infers region from district when region is omitted or unmatched', () => {
      const result = matchHierarchy(undefined, 'AVILA', undefined);
      expect(result.district_id).toBe(21);
      expect(result.district_name).toBe('AVILA');
      expect(result.region_id).toBe(5);
      expect(result.region_name).toBe('DISTRITO CAPITAL');
    });

    it('infers district and region from group when both are omitted', () => {
      const result = matchHierarchy(undefined, undefined, 'DON BOSCO 21');
      expect(result.group_id).toBe(64);
      expect(result.district_id).toBe(21);
      expect(result.region_id).toBe(5);
    });

    it('returns raw strings if no match is found in hierarchy', () => {
      const result = matchHierarchy('Region Fantasma', 'Distrito Desconocido', 'Grupo 999');
      expect(result.region_id).toBeUndefined();
      expect(result.region_name).toBe('Region Fantasma');
      expect(result.district_id).toBeUndefined();
      expect(result.district_name).toBe('Distrito Desconocido');
      expect(result.group_id).toBeUndefined();
      expect(result.group_name).toBe('Grupo 999');
    });

    it('handles empty / undefined inputs gracefully', () => {
      const result = matchHierarchy();
      expect(result.region_id).toBeUndefined();
      expect(result.district_id).toBeUndefined();
      expect(result.group_id).toBeUndefined();
    });
  });

  describe('classifyScoutUnitAndType', () => {
    it('classifies Manada based on text or age', () => {
      const byText = classifyScoutUnitAndType({ unidad: 'Manada San Francisco' });
      expect(byText.unit).toBe('manada');
      expect(byText.member_type).toBe('young');

      const byAge = classifyScoutUnitAndType({ edad: 9 });
      expect(byAge.unit).toBe('manada');
      expect(byAge.member_type).toBe('young');
    });

    it('classifies Tropa based on text or age', () => {
      const byText = classifyScoutUnitAndType({ unidad: 'Tropa Femenina' });
      expect(byText.unit).toBe('tropa');
      expect(byText.member_type).toBe('young');

      const byAge = classifyScoutUnitAndType({ edad: 13 });
      expect(byAge.unit).toBe('tropa');
      expect(byAge.member_type).toBe('young');
    });

    it('classifies Caminantes based on text or age', () => {
      const byText = classifyScoutUnitAndType({ unidad: 'Comunidad de Caminantes' });
      expect(byText.unit).toBe('caminantes');
      expect(byText.member_type).toBe('young');

      const byAge = classifyScoutUnitAndType({ edad: 17 });
      expect(byAge.unit).toBe('caminantes');
      expect(byAge.member_type).toBe('young');
    });

    it('classifies Clan based on text or age', () => {
      const byText = classifyScoutUnitAndType({ unidad: 'Clan Rover' });
      expect(byText.unit).toBe('clan');
      expect(byText.member_type).toBe('young');

      const byAge = classifyScoutUnitAndType({ edad: 20 });
      expect(byAge.unit).toBe('clan');
      expect(byAge.member_type).toBe('young');
    });

    it('classifies adult leaders and coordinators as institucional / adult', () => {
      const dirigente = classifyScoutUnitAndType({ cargo_grupo: 'Dirigente de Unidad', edad: 25 });
      expect(dirigente.unit).toBe('institucional');
      expect(dirigente.member_type).toBe('adult');

      const jefe = classifyScoutUnitAndType({ cargo_grupo: 'Jefe de Grupo' });
      expect(jefe.unit).toBe('institucional');
      expect(jefe.member_type).toBe('adult');

      const distrital = classifyScoutUnitAndType({ tipo_miembro: 'Institucional Distrital' });
      expect(distrital.unit).toBe('institucional');
      expect(distrital.member_type).toBe('adult');

      const conductor = classifyScoutUnitAndType({ unidad: 'Conductor de Grupo', edad: 40 });
      expect(conductor.unit).toBe('institucional');
      expect(conductor.member_type).toBe('adult');
    });

    it('classifies members >= 21 as adult even if unit looks young', () => {
      const adultInTropa = classifyScoutUnitAndType({ unidad: 'Tropa', edad: 22 });
      expect(adultInTropa.member_type).toBe('adult');
      expect(adultInTropa.unit).toBe('tropa');
    });

    it('correctly classifies adult leader in Comunidad as caminantes / adult (test case 11926931)', () => {
      const irene = classifyScoutUnitAndType({
        unidad: 'Comunidad',
        cargo_grupo: 'Adulto de Programa',
        cargo_institucional: 'Cooperador Nacional de Soporte',
        tipo_miembro: 'Grupo',
        fecha_nacimiento: '1972-09-04'
      });
      expect(irene.unit).toBe('caminantes');
      expect(irene.member_type).toBe('adult');
    });

    it('correctly classifies group leader as institucional / adult without youth unit (test case 12484964)', () => {
      const jose = classifyScoutUnitAndType({
        unidad: 'Conductor de Grupo',
        cargo_grupo: 'Jefe De Grupo',
        cargo_institucional: 'Ninguno',
        tipo_miembro: 'Grupo',
        fecha_nacimiento: '1975-12-16'
      });
      expect(jose.unit).toBe('institucional');
      expect(jose.member_type).toBe('adult');
    });

    it('handles No Scout unit', () => {
      const noScout = classifyScoutUnitAndType({ unidad: 'No Scout', edad: 30 });
      expect(noScout.unit).toBe('no_scout');
      expect(noScout.member_type).toBe('adult');
    });
  });
});
