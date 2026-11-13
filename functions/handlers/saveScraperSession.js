const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const auth = require("../scraper/auth");
const {
  SCRAPER_ENCRYPTION_KEY,
  encryptSessionPayload,
} = require("../scraper/crypto");
const sessionStore = require("../scraper/sessionStore");

/**
 * Firebase Callable Function: saveScraperSession
 *
 * Authenticates once against registro.scouts.org.ve using the caller's Impeesa credentials,
 * encrypts only the resulting session cookies bound to the authenticated Firebase UID,
 * and discards the raw password without ever persisting or logging it.
 */
const saveScraperSessionHandler = async (request) => {
  const uid = request?.auth?.uid;
  if (!uid) {
    throw new HttpsError(
      "unauthenticated",
      "Debes iniciar sesión en Chil para conectar el scraper"
    );
  }

  const rawEmail = request?.data?.email;
  const password = request?.data?.password;
  const email = typeof rawEmail === "string" ? rawEmail.trim() : "";

  if (!email || !password || typeof password !== "string") {
    throw new HttpsError(
      "invalid-argument",
      "Debes ingresar el correo y contraseña de Impeesa"
    );
  }

  let cookies;
  try {
    cookies = await auth.performLogin(email, password);
  } catch (error) {
    const message = error?.message || "";
    logger.warn(`Impeesa login rejected for uid=${uid}: ${message}`);
    if (
      message.includes("Credenciales incorrectas") ||
      message.includes("inicio de sesión fallido") ||
      message.includes("422")
    ) {
      throw new HttpsError(
        "unauthenticated",
        "Credenciales de Impeesa incorrectas o inicio de sesión fallido"
      );
    }
    throw new HttpsError(
      "internal",
      "No se pudo conectar con el Sistema de Registro"
    );
  }

  try {
    const encrypted = encryptSessionPayload(uid, cookies);
    await sessionStore.saveSession(uid, {
      impeesaEmail: email,
      encrypted,
    });

    logger.info(`Encrypted Impeesa session saved for uid=${uid}`);
    return {
      connected: true,
      status: "active",
      impeesaEmail: email,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error(`Failed saving encrypted scraper session for uid=${uid}:`, error);
    throw new HttpsError(
      "internal",
      "Error interno al cifrar y guardar la sesión del scraper"
    );
  }
};

exports.saveScraperSessionHandler = saveScraperSessionHandler;
exports.saveScraperSession = onCall(
  {
    cors: true,
    maxInstances: 10,
    timeoutSeconds: 60,
    secrets: [SCRAPER_ENCRYPTION_KEY],
  },
  saveScraperSessionHandler
);
