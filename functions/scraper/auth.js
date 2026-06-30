const axios = require("axios");
const cheerio = require("cheerio");
const logger = require("firebase-functions/logger");
const { extractCookies, serializeCookies } = require("./cookieHelper");

// Global cached cookie store to optimize scrapers and avoid login on every single call
let cachedCookies = null;
let cachedCredentialsKey = null;

function getCredentialsKey(credentials) {
  if (!credentials) return 'default';
  return `${credentials.email}:${credentials.password}`;
}

function getCachedCookies(credentials) {
  const credentialsKey = getCredentialsKey(credentials);
  if (cachedCookies && cachedCredentialsKey === credentialsKey) {
    return cachedCookies;
  }
  return null;
}

function setCachedCookies(credentials, cookies) {
  cachedCookies = cookies;
  cachedCredentialsKey = getCredentialsKey(credentials);
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

module.exports = {
  performLogin,
  getCredentialsKey,
  getCachedCookies,
  setCachedCookies
};
