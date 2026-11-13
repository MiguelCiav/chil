const admin = require("firebase-admin");

const COLLECTION_NAME = "scraper_sessions";

function getCollection() {
  return admin.firestore().collection(COLLECTION_NAME);
}

/**
 * Persists an encrypted Impeesa session envelope scoped to a Firebase user UID.
 * Never accepts or stores raw passwords.
 * @param {string} uid
 * @param {{ impeesaEmail: string, encrypted: { iv: string, authTag: string, ciphertext: string, keyVersion: number } }} payload
 */
async function saveSession(uid, { impeesaEmail, encrypted }) {
  await getCollection()
    .doc(uid)
    .set({
      impeesaEmail,
      encrypted,
      status: "active",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

/**
 * Returns non-secret metadata for the user's Impeesa session.
 * @param {string} uid
 * @returns {Promise<{ connected: boolean, status: "active" | "expired" | "none", impeesaEmail: string | null, updatedAt: string | null }>}
 */
async function getSessionMetadata(uid) {
  const snap = await getCollection().doc(uid).get();
  if (!snap.exists) {
    return {
      connected: false,
      status: "none",
      impeesaEmail: null,
      updatedAt: null,
    };
  }

  const data = snap.data() || {};
  const status = data.status === "expired" ? "expired" : "active";
  const updatedAt =
    data.updatedAt && typeof data.updatedAt.toDate === "function"
      ? data.updatedAt.toDate().toISOString()
      : null;

  return {
    connected: status === "active" && Boolean(data.encrypted),
    status,
    impeesaEmail: data.impeesaEmail || null,
    updatedAt,
  };
}

/**
 * Returns the encrypted session envelope and metadata for backend decryption.
 * @param {string} uid
 */
async function getSessionEnvelope(uid) {
  const snap = await getCollection().doc(uid).get();
  if (!snap.exists) {
    return null;
  }

  const data = snap.data() || {};
  return {
    status: data.status === "expired" ? "expired" : "active",
    impeesaEmail: data.impeesaEmail || null,
    encrypted: data.encrypted || null,
  };
}

/**
 * Marks an existing session as expired when Impeesa rejects its cookies.
 * @param {string} uid
 */
async function markSessionExpired(uid) {
  const ref = getCollection().doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    return;
  }

  await ref.update({
    status: "expired",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Permanently removes the user's stored scraper session from Firestore.
 * @param {string} uid
 */
async function deleteSession(uid) {
  await getCollection().doc(uid).delete();
}

module.exports = {
  COLLECTION_NAME,
  saveSession,
  getSessionMetadata,
  getSessionEnvelope,
  markSessionExpired,
  deleteSession,
};
