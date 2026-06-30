const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { getCachedCookies, setCachedCookies, performLogin } = require("../scraper/auth");
const { fetchMemberStatusWithCookies } = require("../scraper/lookup");

exports.getMemberStatus = onCall({ cors: true }, async (request) => {
  const { cedula, credentials } = request.data;
  
  if (!cedula) {
    throw new HttpsError("invalid-argument", "La cédula es requerida");
  }

  if (!credentials || !credentials.email || !credentials.password) {
    throw new HttpsError("invalid-argument", "Las credenciales del scraper son requeridas");
  }

  // If we have cached cookies for these credentials, try them first
  const cachedCookies = getCachedCookies(credentials);
  if (cachedCookies) {
    try {
      logger.info(`Attempting lookup for ${cedula} with cached cookies...`);
      const member = await fetchMemberStatusWithCookies(cachedCookies, cedula);
      return member;
    } catch (error) {
      if (error.message === "No registrado") {
        logger.info(`Member ${cedula} is not registered (cached lookup)`);
        throw new HttpsError("not-found", "No registrado");
      }
      logger.info("Cached cookies expired or invalid, logging in again...");
    }
  }

  // Perform login and scrape
  try {
    const cookies = await performLogin(credentials.email, credentials.password);
    setCachedCookies(credentials, cookies);

    const member = await fetchMemberStatusWithCookies(cookies, cedula);
    return member;
  } catch (error) {
    logger.error(`getMemberStatus failed for ${cedula}:`, error);
    if (error.message === "No registrado") {
      throw new HttpsError("not-found", "No registrado");
    }
    throw new HttpsError("internal", error.message || "Error de red al consultar miembro");
  }
});
