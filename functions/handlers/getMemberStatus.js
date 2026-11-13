const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const lookup = require("../scraper/lookup");
const {
  SCRAPER_ENCRYPTION_KEY,
  decryptSessionPayload,
} = require("../scraper/crypto");
const sessionStore = require("../scraper/sessionStore");

/**
 * Firebase Callable Function: getMemberStatus
 *
 * Fetches member status information for a given national ID (`cedula`)
 * using the authenticated caller's server-encrypted Impeesa session cookies.
 */
const getMemberStatusHandler = async (request) => {
  const uid = request?.auth?.uid;
  if (!uid) {
    throw new HttpsError(
      "unauthenticated",
      "Debes iniciar sesión en Chil para consultar miembros"
    );
  }

  const rawCedula = request?.data?.cedula;
  const cedula =
    typeof rawCedula === "string" || typeof rawCedula === "number"
      ? String(rawCedula).trim()
      : "";

  if (!cedula) {
    throw new HttpsError("invalid-argument", "La cédula es requerida");
  }

  const sessionRecord = await sessionStore.getSessionEnvelope(uid);
  if (!sessionRecord || !sessionRecord.encrypted) {
    throw new HttpsError(
      "failed-precondition",
      "No hay una sesión de Impeesa configurada",
      { reason: "SCRAPER_NOT_CONFIGURED" }
    );
  }

  if (sessionRecord.status === "expired") {
    throw new HttpsError(
      "failed-precondition",
      "Tu sesión de Impeesa expiró. Reconéctate en Ajustes del Scraper.",
      { reason: "SCRAPER_SESSION_EXPIRED" }
    );
  }

  let cookies;
  try {
    cookies = decryptSessionPayload(uid, sessionRecord.encrypted);
  } catch (error) {
    logger.error(`Failed decrypting scraper session for uid=${uid}:`, error);
    await sessionStore.markSessionExpired(uid).catch(() => {});
    throw new HttpsError(
      "failed-precondition",
      "No se pudo validar tu sesión de Impeesa. Vuelve a iniciar sesión.",
      { reason: "SCRAPER_SESSION_EXPIRED" }
    );
  }

  try {
    const member = await lookup.fetchMemberStatusWithCookies(cookies, cedula);
    logger.info(
      `Member ${cedula} resolved: ${member.nombre_completo} [Solvente: ${member.solvente_hasta || "N/A"}]`
    );
    return member;
  } catch (error) {
    logger.error(`getMemberStatus failed for ${cedula}:`, error);
    if (error.message === "No registrado") {
      throw new HttpsError("not-found", "No registrado");
    }
    if (
      error.message &&
      error.message.includes("Sesión de scraper no autenticada")
    ) {
      await sessionStore.markSessionExpired(uid).catch(() => {});
      throw new HttpsError(
        "failed-precondition",
        "Tu sesión de Impeesa expiró. Reconéctate en Ajustes del Scraper.",
        { reason: "SCRAPER_SESSION_EXPIRED" }
      );
    }
    throw new HttpsError(
      "internal",
      error.message || "Error de red al consultar miembro"
    );
  }
};

exports.getMemberStatusHandler = getMemberStatusHandler;
exports.getMemberStatus = onCall(
  {
    cors: true,
    maxInstances: 10,
    timeoutSeconds: 60,
    secrets: [SCRAPER_ENCRYPTION_KEY],
  },
  getMemberStatusHandler
);
