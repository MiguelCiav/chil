// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const {
  fetchMemberStatusWithCookies,
  parseDateToISO,
  cleanText,
} = require('../lib/lookup');

describe('scraper-api lookup module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('parseDateToISO normalizes DD/MM/YYYY and YYYY-MM-DD', () => {
    expect(parseDateToISO('04/09/1972')).toBe('1972-09-04');
    expect(parseDateToISO('1990-01-15')).toBe('1990-01-15');
    expect(cleanText('  Hello \n  World ')).toBe('Hello World');
  });

  it('extracts region, distrito, grupo, unidad and full profile fields from modern Impeesa HTML', async () => {
    const fixtureHtml = fs.readFileSync(
      path.join(__dirname, '../../functions/__tests__/fixtures/sample_member_impeesa.html'),
      'utf-8'
    );

    vi.spyOn(axios, 'get').mockResolvedValueOnce({
      status: 200,
      headers: {},
      data: fixtureHtml,
    });

    const member = await fetchMemberStatusWithCookies({ _session_id: 'valid' }, '11926931');

    expect(member.nombre_completo).toBe('Irene del socorro Monsalve Sulbaran');
    expect(member.status).toBe('Activo');
    expect(member.region).toBe('DISTRITO CAPITAL');
    expect(member.distrito).toBe('AVILA');
    expect(member.grupo).toBe('ARISTIDES ROJAS');
    expect(member.unidad).toBe('Comunidad');
    expect(member.cargo_grupo).toBe('Adulto de Programa');
    expect(member.solvente_hasta).toBe('2027-05-21');
    expect(member.member_uuid).toBe('ef39034a-dae7-4f1c-ae01-879bf88ab7a7');
  });
});
