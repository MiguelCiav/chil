const admin = require("firebase-admin");

function parseServiceAccountFromEnv() {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (rawJson && typeof rawJson === "string" && rawJson.trim()) {
    const trimmed = rawJson.trim();
    const decoded = trimmed.startsWith("{")
      ? trimmed
      : Buffer.from(trimmed, "base64").toString("utf8");
    const parsed = JSON.parse(decoded);
    if (parsed.private_key && typeof parsed.private_key === "string") {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    return parsed;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (projectId && clientEmail && privateKey) {
    return {
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
    };
  }

  return null;
}

function getAdmin() {
  if (!admin.apps.length) {
    const serviceAccount = parseServiceAccountFromEnv();
    if (!serviceAccount) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_JSON no está configurada en Vercel"
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  return admin;
}

function getFirestore() {
  return getAdmin().firestore();
}

async function verifyBearerToken(req) {
  const authHeader =
    req?.headers?.authorization || req?.headers?.Authorization || "";

  if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    const err = new Error(
      "Debes iniciar sesión en Chil para usar el scraper"
    );
    err.statusCode = 401;
    err.reason = "UNAUTHENTICATED";
    throw err;
  }

  const idToken = authHeader.slice("Bearer ".length).trim();
  if (!idToken) {
    const err = new Error("Token de autenticación vacío o inválido");
    err.statusCode = 401;
    err.reason = "UNAUTHENTICATED";
    throw err;
  }

  try {
    const decoded = await getAdmin().auth().verifyIdToken(idToken);
    if (!decoded || !decoded.uid) {
      throw new Error("Token sin UID");
    }
    return decoded.uid;
  } catch (error) {
    if (
      error?.message &&
      error.message.includes("FIREBASE_SERVICE_ACCOUNT_JSON")
    ) {
      throw error;
    }
    const err = new Error("Sesión de Chil inválida o expirada");
    err.statusCode = 401;
    err.reason = "UNAUTHENTICATED";
    err.cause = error;
    throw err;
  }
}

module.exports = {
  getAdmin,
  getFirestore,
  verifyBearerToken,
  parseServiceAccountFromEnv,
};
