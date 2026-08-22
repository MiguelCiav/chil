const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const auth = require("../scraper/auth");
const lookup = require("../scraper/lookup");

/**
 * Firebase Callable Function: getMemberStatus
 *
 * Fetches member status information for a given national ID (`cedula`).
 *
 * How it works:
 * 1. Validates request parameters (`cedula` and scraper `credentials`).
 * 2. Attempts an initial lookup using cached session cookies (if present) to optimize response time.
 * 3. If cached cookies are missing or expired/invalid, performs a full login via `performLogin`,
 *    stores the fresh cookies in cache, and queries member status with `fetchMemberStatusWithCookies`.
 * 4. Catches errors and throws corresponding Firebase `HttpsError` responses (`invalid-argument`, `not-found`, `internal`).
 *
 * @param {Object} request - The Firebase Callable request object.
 * @param {Object} request.data - Input payload.
 * @param {string} request.data.cedula - Member ID number.
 * @param {Object} request.data.credentials - Scraper login credentials.
 * @param {string} request.data.credentials.email - Scraper email.
 * @param {string} request.data.credentials.password - Scraper password.
 * @returns {Promise<Object>} Member status information.
 * @throws {HttpsError} If inputs are missing, member is not registered, or authentication/network failure occurs.
 */
const getMemberStatusHandler = async (request) => {
  const { cedula, credentials } = request?.data || {};

  if (!cedula) {
    throw new HttpsError("invalid-argument", "La cédula es requerida");
  }

  if (!credentials?.email || !credentials?.password) {
    throw new HttpsError("invalid-argument", "Las credenciales del scraper son requeridas");
  }

  // If we have cached cookies for these credentials, try them first
  const cachedCookies = auth.getCachedCookies(credentials);
  if (cachedCookies) {
    try {
      logger.info(`Attempting lookup for ${cedula} with cached cookies...`);
      const member = await lookup.fetchMemberStatusWithCookies(cachedCookies, cedula);
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
    const cookies = await auth.performLogin(credentials.email, credentials.password);
    auth.setCachedCookies(credentials, cookies);

    const member = await lookup.fetchMemberStatusWithCookies(cookies, cedula);
    return member;
  } catch (error) {
    logger.error(`getMemberStatus failed for ${cedula}:`, error);
    if (error.message === "No registrado") {
      throw new HttpsError("not-found", "No registrado");
    }
    throw new HttpsError("internal", error.message || "Error de red al consultar miembro");
  }
};

exports.getMemberStatusHandler = getMemberStatusHandler;
exports.getMemberStatus = onCall({ cors: true }, getMemberStatusHandler);
