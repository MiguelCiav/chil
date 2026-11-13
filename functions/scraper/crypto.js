const crypto = require("crypto");
const { defineSecret } = require("firebase-functions/params");

const SCRAPER_ENCRYPTION_KEY = defineSecret("SCRAPER_ENCRYPTION_KEY");
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const KEY_VERSION = 1;

/**
 * Decodes and validates the 32-byte AES-256 encryption key from the Firebase secret.
 * @returns {Buffer}
 */
function getEncryptionKey() {
  const raw = SCRAPER_ENCRYPTION_KEY.value();
  if (!raw || typeof raw !== "string") {
    throw new Error("SCRAPER_ENCRYPTION_KEY no está configurada en el servidor");
  }

  const key = Buffer.from(raw.trim(), "base64");
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `SCRAPER_ENCRYPTION_KEY inválida: se esperan ${KEY_LENGTH} bytes en base64`
    );
  }

  return key;
}

/**
 * Encrypts a cookie map bound to a Firebase user UID using AES-256-GCM.
 * @param {string} uid
 * @param {Record<string, string>} cookieObj
 * @returns {{ iv: string, authTag: string, ciphertext: string, keyVersion: number }}
 */
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

/**
 * Decrypts a stored AES-256-GCM cookie envelope bound to the given UID.
 * @param {string} uid
 * @param {{ iv: string, authTag: string, ciphertext: string, keyVersion: number }} envelope
 * @returns {Record<string, string>}
 */
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
  SCRAPER_ENCRYPTION_KEY,
  KEY_VERSION,
  encryptSessionPayload,
  decryptSessionPayload,
};
