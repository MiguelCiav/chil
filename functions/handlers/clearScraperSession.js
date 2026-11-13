const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const sessionStore = require("../scraper/sessionStore");

/**
 * Firebase Callable Function: clearScraperSession
 *
 * Deletes the caller's encrypted Impeesa session from Firestore.
 */
const clearScraperSessionHandler = async (request) => {
  const uid = request?.auth?.uid;
  if (!uid) {
    throw new HttpsError(
      "unauthenticated",
      "Debes iniciar sesión en Chil para desconectar el scraper"
    );
  }

  await sessionStore.deleteSession(uid);
  logger.info(`Scraper session cleared for uid=${uid}`);

  return {
    connected: false,
    status: "none",
    impeesaEmail: null,
    updatedAt: null,
  };
};

exports.clearScraperSessionHandler = clearScraperSessionHandler;
exports.clearScraperSession = onCall(
  {
    cors: true,
    maxInstances: 10,
    timeoutSeconds: 30,
  },
  clearScraperSessionHandler
);
