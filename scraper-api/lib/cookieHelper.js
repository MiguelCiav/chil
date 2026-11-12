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

module.exports = {
  extractCookies,
  serializeCookies
};
