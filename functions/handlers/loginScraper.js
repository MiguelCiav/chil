const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const auth = require("../scraper/auth");
/**
 * Firebase Callable Function: loginScraper
 *
 * Authenticates scraper credentials against the target portal and caches the resulting session cookies.
 *
 * How it works:
 * 1. Validates that required `credentials` (`email` and `password`) are provided in request data.
 * 2. Authenticates by calling `performLogin(credentials.email, credentials.password)`.
 * 3. On successful authentication, caches the resulting session cookies via `setCachedCookies`.
 * 4. Returns `{ success: true }` or throws appropriate Firebase `HttpsError` (`invalid-argument`, `unauthenticated`).
 *
 * @param {Object} request - The Firebase Callable request object.
 * @param {Object} request.data - Input payload.
 * @param {Object} request.data.credentials - Scraper login credentials.
 * @param {string} request.data.credentials.email - Scraper email address.
 * @param {string} request.data.credentials.password - Scraper password.
 * @returns {Promise<{success: boolean}>} Object indicating successful authentication and cookie caching.
 * @throws {HttpsError} If credentials are missing/incomplete or authentication fails.
 */
const loginScraperHandler = async (request) => {
  const { credentials } = request?.data || {};
  if (!credentials?.email || !credentials?.password) {
    throw new HttpsError("invalid-argument", "Credenciales incompletas");
  }

  try {
    const cookies = await auth.performLogin(credentials.email, credentials.password);
    auth.setCachedCookies(credentials, cookies);
    return { success: true };
  } catch (error) {
    logger.error("loginScraper error:", error);
    throw new HttpsError("unauthenticated", error.message || "Error al iniciar sesión");
  }
};

exports.loginScraperHandler = loginScraperHandler;
exports.loginScraper = onCall({ cors: true }, loginScraperHandler);
