const firebaseAdmin = require("./firebaseAdmin");

function handleCorsAndMethod(req, res, allowedMethods = ["POST"]) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    [...allowedMethods, "OPTIONS"].join(", ")
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return { handled: true };
  }

  if (!allowedMethods.includes(req.method)) {
    res.status(405).json({ error: "Method not allowed" });
    return { handled: true };
  }

  return { handled: false };
}

function parseJsonBody(req) {
  let body = req?.body;
  if (body === undefined || body === null || body === "") {
    return {};
  }
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      const err = new Error("Cuerpo de solicitud JSON inválido");
      err.statusCode = 400;
      throw err;
    }
  }
  return body;
}

async function authenticateRequest(req, res) {
  try {
    return await firebaseAdmin.verifyBearerToken(req);
  } catch (error) {
    const status = error?.statusCode || 500;
    res.status(status).json({
      error: error?.message || "No autorizado",
      ...(error?.reason ? { reason: error.reason } : {}),
    });
    return null;
  }
}

module.exports = {
  handleCorsAndMethod,
  parseJsonBody,
  authenticateRequest,
};
