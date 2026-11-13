const sessionStore = require("../lib/sessionStore");
const { handleCorsAndMethod, authenticateRequest } = require("../lib/httpHelper");

module.exports = async function handler(req, res) {
  const { handled } = handleCorsAndMethod(req, res, ["POST", "DELETE"]);
  if (handled) return;

  const uid = await authenticateRequest(req, res);
  if (!uid) return;

  try {
    await sessionStore.deleteSession(uid);
    return res.status(200).json({
      connected: false,
      status: "none",
      impeesaEmail: null,
      updatedAt: null,
    });
  } catch (error) {
    console.error(`Failed clearing scraper session for uid=${uid}:`, error);
    return res.status(500).json({
      error: "Error interno al desconectar la sesión del scraper",
    });
  }
};
