// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { fetchMemberStatusWithCookies, parseDateToISO, cleanText } = require('../scraper/lookup');

describe('lookup scraper module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('helper normalizers', () => {
    it('parseDateToISO normalizes DD/MM/YYYY and YYYY-MM-DD correctly', () => {
      expect(parseDateToISO('04/09/1972')).toBe('1972-09-04');
      expect(parseDateToISO('21-05-2027')).toBe('2027-05-21');
      expect(parseDateToISO('1990-01-15')).toBe('1990-01-15');
      expect(parseDateToISO('  18/09/2009  ')).toBe('2009-09-18');
      expect(parseDateToISO('')).toBe('');
      expect(parseDateToISO('Invalid Date')).toBe('');
    });

    it('cleanText trims and collapses excessive whitespaces', () => {
      expect(cleanText('  Hello \n  World \t ')).toBe('Hello World');
      expect(cleanText('')).toBe('');
    });
  });

  describe('authentication & error handling', () => {
    it('throws error when session is expired or redirects to sign in', async () => {
      vi.spyOn(axios, 'get').mockResolvedValueOnce({
        status: 302,
        headers: { location: 'https://registro.scouts.org.ve/users/sign_in' },
        data: ''
      });

      await expect(
        fetchMemberStatusWithCookies({ _session_id: 'expired' }, '12345678')
      ).rejects.toThrow('Sesión de scraper no autenticada o expirada');
    });

    it('throws error when search returns login form HTML', async () => {
      vi.spyOn(axios, 'get').mockResolvedValueOnce({
        status: 200,
        headers: {},
        data: '<html><body><input name="user[email]" /></body></html>'
      });

      await expect(
        fetchMemberStatusWithCookies({ _session_id: 'expired' }, '12345678')
      ).rejects.toThrow('Sesión de scraper no autenticada o expirada');
    });

    it('throws error when member is not found ("No registrado")', async () => {
      vi.spyOn(axios, 'get').mockResolvedValueOnce({
        status: 200,
        headers: {},
        data: '<html><body><div class="alert alert-danger">No se encontró ningún miembro registrado con la cédula ingresada (99999999).</div></body></html>'
      });

      await expect(
        fetchMemberStatusWithCookies({ _session_id: 'valid' }, '99999999')
      ).rejects.toThrow('No registrado');
    });
  });

  describe('legacy layout fallback', () => {
    it('successfully parses member details from legacy p.mb-1 format with defaults', async () => {
      const htmlData = `
        <html>
          <body>
            <div class="card-body">
              <p class="mb-1">Nombre Completo: Juan Carlos Perez</p>
              <p class="mb-1">Status: Registro válido</p>
              <p class="mb-1">Telefono: +58 412 1234567</p>
              <p class="mb-1">Correo Electronico: juan.perez@example.com</p>
              <p class="mb-1">Fecha de Nacimiento: 25/10/2004</p>
            </div>
          </body>
        </html>
      `;

      vi.spyOn(axios, 'get').mockResolvedValueOnce({
        status: 200,
        headers: {},
        data: htmlData
      });

      const member = await fetchMemberStatusWithCookies({ _session_id: 'valid' }, '12345678');

      expect(member.nombre_completo).toBe('Juan Carlos Perez');
      expect(member.status).toBe('Registro válido');
      expect(member.telefono).toBe('+58 412 1234567');
      expect(member.correo_electronico).toBe('juan.perez@example.com');
      expect(member.fecha_nacimiento).toBe('2004-10-25');
      expect(member.cedula).toBe('12345678');
      expect(member.region).toBe('');
      expect(member.edad).toBeNull();
    });
  });

  describe('modern Impeesa portal extraction', () => {
    it('successfully extracts all 26+ fields from modern Impeesa fixture', async () => {
      const fixtureHtml = fs.readFileSync(
        path.join(__dirname, 'fixtures/sample_member_impeesa.html'),
        'utf-8'
      );

      vi.spyOn(axios, 'get').mockResolvedValueOnce({
        status: 200,
        headers: {},
        data: fixtureHtml
      });

      const member = await fetchMemberStatusWithCookies({ _session_id: 'valid' }, '11926931');

      // 1. Identity & Core
      expect(member.nombre_completo).toBe('Irene del socorro Monsalve Sulbaran');
      expect(member.status).toBe('Activo');
      expect(member.cedula_raw).toBe('E-11.926.931');
      expect(member.cedula).toBe('11926931');
      expect(member.genero).toBe('Femenino');
      expect(member.fecha_nacimiento).toBe('1972-09-04');
      expect(member.fecha_nacimiento_raw).toBe('04/09/1972');
      expect(member.edad).toBe(54);
      expect(member.member_uuid).toBe('ef39034a-dae7-4f1c-ae01-879bf88ab7a7');
      expect(member.avatar_url).toBe('https://res.cloudinary.com/scouts-venezuela/image/upload/v12345/avatar_irene.jpg');

      // 2. Territorial Hierarchy
      expect(member.region).toBe('DISTRITO CAPITAL');
      expect(member.distrito).toBe('AVILA');
      expect(member.grupo).toBe('ARISTIDES ROJAS');

      // 3. Scout Unit & Roles
      expect(member.unidad).toBe('Comunidad');
      expect(member.cargo_grupo).toBe('Adulto de Programa');
      expect(member.cargo_institucional).toBe('Cooperador Nacional de Soporte');
      expect(member.tipo_miembro).toBe('Grupo');

      // 4. Progression & Solvency
      expect(member.solvente_hasta).toBe('2027-05-21');
      expect(member.solvente_hasta_raw).toBe('21/05/2027');
      expect(member.progresion_actual).toBe('Sin progresión registrada');
      expect(member.fecha_ingreso).toBe('2009-08-01');
      expect(member.fecha_promesa).toBe('2009-09-18');
      expect(member.rol_sistema).toBe('Coop/Direc - Nacional - Consulta');

      // 5. Contact & Demographics
      expect(member.telefono).toBe('04123473083');
      expect(member.correo_electronico).toBe('irenescoutsdb@gmail.com');
      expect(member.correo_secundario).toBe('monsalveirene63@gmail.com');
      expect(member.ubicacion_estado).toBe('Distrito Capital - Libertador');
      expect(member.direccion).toBe('Av Libertador Santa Rosa');
      expect(member.religion).toBe('Budistas');
      expect(member.nivel_educativo).toBe('Superior');
      expect(member.ocupacion).toBe('Directora de Despacho Decanato');

      // 6. Assets
      expect(member.carnet_pdf_url).toContain('member_id=ef39034a-dae7-4f1c-ae01-879bf88ab7a7');
      expect(member.medical_pdf_url).toContain('ef39034a-dae7-4f1c-ae01-879bf88ab7a7/medical_file_pdf.pdf');
    });

    it('strictly isolates member data from session banner header (Anti-Contamination Check)', async () => {
      const fixtureHtml = fs.readFileSync(
        path.join(__dirname, 'fixtures/sample_member_impeesa.html'),
        'utf-8'
      );

      vi.spyOn(axios, 'get').mockResolvedValueOnce({
        status: 200,
        headers: {},
        data: fixtureHtml
      });

      const member = await fetchMemberStatusWithCookies({ _session_id: 'valid' }, '11926931');

      // Ensure data from logged-in admin (Miguel Ciavato / DON BOSCO 21) does NOT leak into member
      expect(member.nombre_completo).not.toContain('Miguel');
      expect(member.grupo).toBe('ARISTIDES ROJAS');
      expect(member.grupo).not.toBe('DON BOSCO 21');
      expect(member.unidad).not.toBe('Conductor de Grupo');
      expect(member.solvente_hasta).not.toBe('2027-05-30'); // 2027-05-30 belongs to session header!
    });
  });
});
