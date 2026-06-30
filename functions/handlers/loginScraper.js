const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { performLogin, setCachedCookies } = require("../scraper/auth");

exports.loginScraper = onCall({ cors: true }, async (request) => {
  const { credentials } = request.data;
  if (!credentials || !credentials.email || !credentials.password) {
    throw new HttpsError("invalid-argument", "Credenciales incompletas");
  }

  try {
    const cookies = await performLogin(credentials.email, credentials.password);
    setCachedCookies(credentials, cookies);
    return { success: true };
  } catch (error) {
    logger.error("loginScraper error:", error);
    throw new HttpsError("unauthenticated", error.message || "Error al iniciar sesión");
  }
});
