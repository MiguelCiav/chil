const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const KEY_VERSION = 1;

function getEncryptionKey() {
  const raw = process.env.SCRAPER_ENCRYPTION_KEY;
  if (!raw || typeof raw !== "string") {
    throw new Error("SCRAPER_ENCRYPTION_KEY no está configurada en Vercel");
  }

  const key = Buffer.from(raw.trim(), "base64");
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `SCRAPER_ENCRYPTION_KEY inválida: se esperan ${KEY_LENGTH} bytes en base64`
    );
  }

  return key;
}

function encryptSessionPayload(uid, cookieObj) {
  if (!uid || typeof uid !== "string") {
    throw new Error("UID requerido para cifrar la sesión");
  }
  if (!cookieObj || typeof cookieObj !== "object" || Array.isArray(cookieObj)) {
    throw new Error("Payload de cookies inválido");
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(Buffer.from(uid, "utf8"));

  const plaintext = Buffer.from(JSON.stringify(cookieObj), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    ciphertext: encrypted.toString("base64"),
    keyVersion: KEY_VERSION,
  };
}

function decryptSessionPayload(uid, envelope) {
  if (!uid || typeof uid !== "string") {
    throw new Error("UID requerido para descifrar la sesión");
  }
  if (
    !envelope ||
    typeof envelope !== "object" ||
    envelope.keyVersion !== KEY_VERSION ||
    !envelope.iv ||
    !envelope.authTag ||
    !envelope.ciphertext
  ) {
    throw new Error("Sobre de sesión cifrado inválido o versión no soportada");
  }

  const iv = Buffer.from(envelope.iv, "base64");
  const authTag = Buffer.from(envelope.authTag, "base64");
  const ciphertext = Buffer.from(envelope.ciphertext, "base64");

  if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error("Parámetros criptográficos inválidos en la sesión");
  }

  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAAD(Buffer.from(uid, "utf8"));
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  const parsed = JSON.parse(decrypted.toString("utf8"));

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Contenido descifrado inválido");
  }

  return parsed;
}

module.exports = {
  KEY_VERSION,
  encryptSessionPayload,
  decryptSessionPayload,
};
