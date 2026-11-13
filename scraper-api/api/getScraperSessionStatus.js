const sessionStore = require("../lib/sessionStore");
const { handleCorsAndMethod, authenticateRequest } = require("../lib/httpHelper");

module.exports = async function handler(req, res) {
  const { handled } = handleCorsAndMethod(req, res, ["GET", "POST"]);
  if (handled) return;

  const uid = await authenticateRequest(req, res);
  if (!uid) return;

  try {
    const metadata = await sessionStore.getSessionMetadata(uid);
    return res.status(200).json(metadata);
  } catch (error) {
    console.error(`Failed reading session status for uid=${uid}:`, error);
    return res.status(500).json({
      error: "Error interno al consultar el estado de la sesión del scraper",
    });
  }
};
