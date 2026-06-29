const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const axios = require("axios");
const cheerio = require("cheerio");

admin.initializeApp();

// Helper to extract and merge cookies from set-cookie headers
function extractCookies(setCookieHeader) {
  if (!setCookieHeader) return {};
  const cookies = {};
  const headers = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  headers.forEach(header => {
    const parts = header.split(';')[0].split('=');
    if (parts.length >= 2) {
      const name = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      cookies[name] = value;
    }
  });
  return cookies;
}

function serializeCookies(cookiesObj) {
  return Object.entries(cookiesObj)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

// Global cached cookie store to optimize scrapers and avoid login on every single call
let cachedCookies = null;
let cachedCredentialsKey = null;

function getCredentialsKey(credentials) {
  if (!credentials) return 'default';
  return `${credentials.email}:${credentials.password}`;
}

async function performLogin(email, password) {
  logger.info("Attempting login to registro.scouts.org.ve...");
  
  const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  // 1. Get login page to extract authenticity_token
  const getResp = await axios.get("https://registro.scouts.org.ve/", {
    headers: {
      'User-Agent': userAgent
    },
    validateStatus: status => status >= 200 && status < 400
  });
  
  let cookies = extractCookies(getResp.headers['set-cookie']);
  const $ = cheerio.load(getResp.data);
  const token = $("input[name='authenticity_token']").val();
  
  if (!token) {
    throw new Error("Failed to find authenticity_token for login");
  }

  // 2. Submit credentials
  const formData = new URLSearchParams();
  formData.append('authenticity_token', token);
  formData.append('user[email]', email);
  formData.append('user[password]', password);

  const loginResp = await axios.post("https://registro.scouts.org.ve/users/sign_in", formData, {
    headers: {
      'Cookie': serializeCookies(cookies),
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': userAgent,
      'Referer': 'https://registro.scouts.org.ve/users/sign_in'
    },
    maxRedirects: 0,
    validateStatus: status => status >= 200 && status < 400
  });

  const finalCookies = { ...cookies, ...extractCookies(loginResp.headers['set-cookie']) };
  
  // Check if we stayed on sign_in page (usually denotes error)
  if (loginResp.status === 200 && loginResp.data.includes("user[email]")) {
    throw new Error("Credenciales incorrectas o inicio de sesión fallido");
  }

  logger.info("Login successful!");
  return finalCookies;
}

async function fetchMemberStatusWithCookies(cookies, cedula) {
  const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  const searchResp = await axios.get("https://registro.scouts.org.ve/members/status_member_submit", {
    params: {
      cedula: cedula,
      commit: "Buscar"
    },
    headers: {
      'Cookie': serializeCookies(cookies),
      'User-Agent': userAgent
    },
    validateStatus: status => status >= 200 && status < 400
  });

  const redirectUrl = searchResp.headers['location'] || '';
  if (redirectUrl.includes('/users/sign_in') || (searchResp.status === 200 && searchResp.data.includes("user[email]"))) {
    throw new Error("Sesión de scraper no autenticada o expirada");
  }

  const $ = cheerio.load(searchResp.data);
  const member = {
    nombre_completo: "",
    status: "",
    telefono: "",
    correo_electronico: "",
    fecha_nacimiento: ""
  };

  $("p.mb-1").each((i, elem) => {
    const text = $(elem).text();
    const parts = text.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join(':').trim();
      switch (key) {
        case "Nombre Completo":
          member.nombre_completo = val;
          break;
        case "Status":
          member.status = val;
          break;
        case "Telefono":
          member.telefono = val;
          break;
        case "Correo Electronico":
          member.correo_electronico = val;
          break;
        case "Fecha de Nacimiento":
          member.fecha_nacimiento = val;
          break;
      }
    }
  });

  if (!member.nombre_completo) {
    throw new Error("No registrado");
  }

  return member;
}

exports.loginScraper = onCall({ cors: true }, async (request) => {
  const { credentials } = request.data;
  if (!credentials || !credentials.email || !credentials.password) {
    throw new HttpsError("invalid-argument", "Credenciales incompletas");
  }

  try {
    const cookies = await performLogin(credentials.email, credentials.password);
    cachedCookies = cookies;
    cachedCredentialsKey = getCredentialsKey(credentials);
    return { success: true };
  } catch (error) {
    logger.error("loginScraper error:", error);
    throw new HttpsError("unauthenticated", error.message || "Error al iniciar sesión");
  }
});

exports.getMemberStatus = onCall({ cors: true }, async (request) => {
  const { cedula, credentials } = request.data;
  
  if (!cedula) {
    throw new HttpsError("invalid-argument", "La cédula es requerida");
  }

  if (!credentials || !credentials.email || !credentials.password) {
    throw new HttpsError("invalid-argument", "Las credenciales del scraper son requeridas");
  }

  const credentialsKey = getCredentialsKey(credentials);

  // If we have cached cookies for these credentials, try them first
  if (cachedCookies && cachedCredentialsKey === credentialsKey) {
    try {
      logger.info(`Attempting lookup for ${cedula} with cached cookies...`);
      const member = await fetchMemberStatusWithCookies(cachedCookies, cedula);
      return member;
    } catch (error) {
      if (error.message === "No registrado") {
        logger.info(`Member ${cedula} is not registered (cached lookup)`);
        throw new HttpsError("not-found", "No registrado");
      }
      logger.info("Cached cookies expired or invalid, logging in again...");
    }
  }

  // Perform login and scrape
  try {
    const cookies = await performLogin(credentials.email, credentials.password);
    cachedCookies = cookies;
    cachedCredentialsKey = credentialsKey;

    const member = await fetchMemberStatusWithCookies(cookies, cedula);
    return member;
  } catch (error) {
    logger.error(`getMemberStatus failed for ${cedula}:`, error);
    if (error.message === "No registrado") {
      throw new HttpsError("not-found", "No registrado");
    }
    throw new HttpsError("internal", error.message || "Error de red al consultar miembro");
  }
});
