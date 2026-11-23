const admin = require("firebase-admin");

const COLLECTION_NAME = "scraper_sessions";
const SESSION_CACHE_TTL_MS = 2 * 60 * 1000;

const sessionCache = new Map();
const inFlightReads = new Map();

function getCollection() {
  return admin.firestore().collection(COLLECTION_NAME);
}

function getServerTimestamp() {
  return admin.firestore.FieldValue.serverTimestamp();
}

function isNotFoundError(err) {
  if (!err) return false;
  return (
    err.code === 5 ||
    err.code === "not-found" ||
    err.code === "NOT_FOUND" ||
    (typeof err.message === "string" && err.message.includes("NOT_FOUND"))
  );
}

function clearSessionCache() {
  sessionCache.clear();
  inFlightReads.clear();
}

async function readSessionDoc(uid) {
  const now = Date.now();
  const cached = sessionCache.get(uid);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const pending = inFlightReads.get(uid);
  if (pending) {
    return pending;
  }

  const promise = getCollection()
    .doc(uid)
    .get()
    .then((snap) => {
      const data = snap.exists ? snap.data() || {} : null;
      sessionCache.set(uid, {
        data,
        expiresAt: Date.now() + SESSION_CACHE_TTL_MS,
      });
      return data;
    })
    .finally(() => {
      inFlightReads.delete(uid);
    });

  inFlightReads.set(uid, promise);
  return promise;
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
      updatedAt: getServerTimestamp(),
    });

  const savedAt = new Date();
  sessionCache.set(uid, {
    data: {
      impeesaEmail,
      encrypted,
      status: "active",
      updatedAt: { toDate: () => savedAt },
    },
    expiresAt: Date.now() + SESSION_CACHE_TTL_MS,
  });
}

/**
 * Returns non-secret metadata for the user's Impeesa session.
 * @param {string} uid
 * @returns {Promise<{ connected: boolean, status: "active" | "expired" | "none", impeesaEmail: string | null, updatedAt: string | null }>}
 */
async function getSessionMetadata(uid) {
  const data = await readSessionDoc(uid);
  if (!data) {
    return {
      connected: false,
      status: "none",
      impeesaEmail: null,
      updatedAt: null,
    };
  }

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
  const data = await readSessionDoc(uid);
  if (!data) {
    return null;
  }

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
  try {
    await ref.update({
      status: "expired",
      updatedAt: getServerTimestamp(),
    });
  } catch (err) {
    if (isNotFoundError(err)) {
      sessionCache.set(uid, {
        data: null,
        expiresAt: Date.now() + SESSION_CACHE_TTL_MS,
      });
      return;
    }
    throw err;
  }

  const cached = sessionCache.get(uid);
  if (cached && cached.data) {
    const expiredAt = new Date();
    sessionCache.set(uid, {
      data: {
        ...cached.data,
        status: "expired",
        updatedAt: { toDate: () => expiredAt },
      },
      expiresAt: Date.now() + SESSION_CACHE_TTL_MS,
    });
  }
}

/**
 * Permanently removes the user's stored scraper session from Firestore.
 * @param {string} uid
 */
async function deleteSession(uid) {
  await getCollection().doc(uid).delete();
  sessionCache.delete(uid);
  inFlightReads.delete(uid);
}

module.exports = {
  COLLECTION_NAME,
  SESSION_CACHE_TTL_MS,
  saveSession,
  getSessionMetadata,
  getSessionEnvelope,
  markSessionExpired,
  deleteSession,
  clearSessionCache,
};
