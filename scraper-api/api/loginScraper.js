const auth = require("../lib/auth");

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

  const credentials = body?.credentials || body?.data?.credentials;
  if (!credentials?.email || !credentials?.password) {
    return res.status(400).json({ error: "Credenciales incompletas" });
  }

  try {
    const cookies = await auth.performLogin(credentials.email, credentials.password);
    auth.setCachedCookies(credentials, cookies);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("loginScraper error:", error);
    return res.status(401).json({ error: error.message || "Error al iniciar sesión" });
  }
};
