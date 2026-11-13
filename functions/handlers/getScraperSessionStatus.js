const { onCall, HttpsError } = require("firebase-functions/v2/https");
const sessionStore = require("../scraper/sessionStore");

/**
 * Firebase Callable Function: getScraperSessionStatus
 *
 * Returns non-secret metadata about the caller's stored Impeesa session.
 */
const getScraperSessionStatusHandler = async (request) => {
  const uid = request?.auth?.uid;
  if (!uid) {
    throw new HttpsError(
      "unauthenticated",
      "Debes iniciar sesión en Chil para consultar la sesión del scraper"
    );
  }

  return await sessionStore.getSessionMetadata(uid);
};

exports.getScraperSessionStatusHandler = getScraperSessionStatusHandler;
exports.getScraperSessionStatus = onCall(
  {
    cors: true,
    maxInstances: 10,
    timeoutSeconds: 30,
  },
  getScraperSessionStatusHandler
);
