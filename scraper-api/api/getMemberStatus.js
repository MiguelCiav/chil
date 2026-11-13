const lookup = require("../lib/lookup");
const { decryptSessionPayload } = require("../lib/crypto");
const sessionStore = require("../lib/sessionStore");
const {
  handleCorsAndMethod,
  parseJsonBody,
  authenticateRequest,
} = require("../lib/httpHelper");

module.exports = async function handler(req, res) {
  const { handled } = handleCorsAndMethod(req, res, ["POST"]);
  if (handled) return;

  const uid = await authenticateRequest(req, res);
  if (!uid) return;

  let body;
  try {
    body = parseJsonBody(req);
  } catch (error) {
    return res.status(error.statusCode || 400).json({ error: error.message });
  }

  const payload = body?.data || body || {};
  const rawCedula = payload.cedula;
  const cedula =
    typeof rawCedula === "string" || typeof rawCedula === "number"
      ? String(rawCedula).trim()
      : "";

  if (!cedula) {
    return res.status(400).json({ error: "La cédula es requerida" });
  }

  let sessionRecord;
  try {
    sessionRecord = await sessionStore.getSessionEnvelope(uid);
  } catch (error) {
    console.error(`Failed fetching session envelope for uid=${uid}:`, error);
    return res.status(500).json({ error: "Error al leer la sesión del scraper" });
  }

  if (!sessionRecord || !sessionRecord.encrypted) {
    return res.status(412).json({
      error: "No hay una sesión de Impeesa configurada",
      reason: "SCRAPER_NOT_CONFIGURED",
    });
  }

  if (sessionRecord.status === "expired") {
    return res.status(412).json({
      error: "Tu sesión de Impeesa expiró. Reconéctate en Ajustes del Scraper.",
      reason: "SCRAPER_SESSION_EXPIRED",
    });
  }

  let cookies;
  try {
    cookies = decryptSessionPayload(uid, sessionRecord.encrypted);
  } catch (error) {
    console.error(`Failed decrypting scraper session for uid=${uid}:`, error);
    await sessionStore.markSessionExpired(uid).catch(() => {});
    return res.status(412).json({
      error: "No se pudo validar tu sesión de Impeesa. Vuelve a iniciar sesión.",
      reason: "SCRAPER_SESSION_EXPIRED",
    });
  }

  try {
    const member = await lookup.fetchMemberStatusWithCookies(cookies, cedula);
    return res.status(200).json({ data: member });
  } catch (error) {
    console.error(`getMemberStatus failed for ${cedula}:`, error);
    if (error.message === "No registrado") {
      return res.status(404).json({ error: "No registrado" });
    }
    if (
      error.message &&
      error.message.includes("Sesión de scraper no autenticada")
    ) {
      await sessionStore.markSessionExpired(uid).catch(() => {});
      return res.status(412).json({
        error: "Tu sesión de Impeesa expiró. Reconéctate en Ajustes del Scraper.",
        reason: "SCRAPER_SESSION_EXPIRED",
      });
    }
    return res.status(500).json({
      error: error.message || "Error de red al consultar miembro",
    });
  }
};
