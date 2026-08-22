// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
const axios = require('axios');
const { fetchMemberStatusWithCookies } = require('../scraper/lookup');

describe('lookup scraper module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

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
      data: '<html><body><div class="alert alert-warning">No se encontraron resultados</div></body></html>'
    });

    await expect(
      fetchMemberStatusWithCookies({ _session_id: 'valid' }, '99999999')
    ).rejects.toThrow('No registrado');
  });

  it('successfully parses member details when found', async () => {
    const htmlData = `
      <html>
        <body>
          <div class="card-body">
            <p class="mb-1">Nombre Completo: Juan Carlos Perez</p>
            <p class="mb-1">Status: Registro válido</p>
            <p class="mb-1">Telefono: +58 412 1234567</p>
            <p class="mb-1">Correo Electronico: juan.perez@example.com</p>
            <p class="mb-1">Fecha de Nacimiento: 2004-10-25</p>
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

    expect(member).toEqual({
      nombre_completo: 'Juan Carlos Perez',
      status: 'Registro válido',
      telefono: '+58 412 1234567',
      correo_electronico: 'juan.perez@example.com',
      fecha_nacimiento: '2004-10-25'
    });
  });
});
