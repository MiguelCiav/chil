const auth = require("../lib/auth");
const { encryptSessionPayload } = require("../lib/crypto");
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
  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const password = payload.password;

  if (!email || !password || typeof password !== "string") {
    return res
      .status(400)
      .json({ error: "Debes ingresar el correo y contraseña de Impeesa" });
  }

  let cookies;
  try {
    cookies = await auth.performLogin(email, password);
  } catch (error) {
    const message = error?.message || "";
    console.warn(`Impeesa login rejected for uid=${uid}: ${message}`);
    if (
      message.includes("Credenciales incorrectas") ||
      message.includes("inicio de sesión fallido") ||
      message.includes("422")
    ) {
      return res.status(401).json({
        error: "Credenciales de Impeesa incorrectas o inicio de sesión fallido",
        reason: "IMPEESA_INVALID_CREDENTIALS",
      });
    }
    return res.status(500).json({
      error: "No se pudo conectar con el Sistema de Registro",
    });
  }

  try {
    const encrypted = encryptSessionPayload(uid, cookies);
    await sessionStore.saveSession(uid, {
      impeesaEmail: email,
      encrypted,
    });

    return res.status(200).json({
      connected: true,
      status: "active",
      impeesaEmail: email,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Failed saving encrypted session for uid=${uid}:`, error);
    return res.status(500).json({
      error: "Error interno al cifrar y guardar la sesión del scraper",
    });
  }
};
