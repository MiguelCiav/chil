const auth = require("../lib/auth");
const lookup = require("../lib/lookup");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Cuerpo de solicitud JSON inválido" });
    }
  }

  const payload = body?.data || body || {};
  const { cedula, credentials } = payload;

  if (!cedula) {
    return res.status(400).json({ error: "La cédula es requerida" });
  }

  if (!credentials?.email || !credentials?.password) {
    return res.status(400).json({ error: "Las credenciales del scraper son requeridas" });
  }

  // 1. Try cached cookies first if available
  const cachedCookies = auth.getCachedCookies(credentials);
  if (cachedCookies) {
    try {
      const member = await lookup.fetchMemberStatusWithCookies(cachedCookies, cedula);
      return res.status(200).json({ data: member });
    } catch (error) {
      if (error.message === "No registrado") {
        return res.status(404).json({ error: "No registrado" });
      }
      console.log("Cached cookies expired or invalid, logging in again...");
    }
  }

  // 2. Perform fresh login and scrape
  try {
    const cookies = await auth.performLogin(credentials.email, credentials.password);
    auth.setCachedCookies(credentials, cookies);

    const member = await lookup.fetchMemberStatusWithCookies(cookies, cedula);
    return res.status(200).json({ data: member });
  } catch (error) {
    console.error(`getMemberStatus failed for ${cedula}:`, error);
    if (error.message === "No registrado") {
      return res.status(404).json({ error: "No registrado" });
    }
    if (
      error.message &&
      (error.message.includes("Credenciales incorrectas") ||
        error.message.includes("inicio de sesión fallido") ||
        error.message.includes("Sesión de scraper no autenticada") ||
        error.message.includes("422"))
    ) {
      return res.status(401).json({
        error: "Credenciales incorrectas o sesión expirada en Sistema de Registro"
      });
    }
    return res.status(500).json({
      error: error.message || "Error de red al consultar miembro"
    });
  }
};
