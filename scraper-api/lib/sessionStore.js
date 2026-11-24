const firebaseAdmin = require("./firebaseAdmin");

const COLLECTION_NAME = "scraper_sessions";
const SESSION_CACHE_TTL_MS = 2 * 60 * 1000;

const sessionCache = new Map();
const inFlightReads = new Map();

function getCollection() {
  return firebaseAdmin.getFirestore().collection(COLLECTION_NAME);
}

function getServerTimestamp() {
  return firebaseAdmin.getAdmin().firestore.FieldValue.serverTimestamp();
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
      // Only cache active sessions; never cache expired or missing docs so reconnects
      // in another serverless container take effect immediately.
      if (data && data.status !== "expired") {
        sessionCache.set(uid, {
          data,
          expiresAt: Date.now() + SESSION_CACHE_TTL_MS,
        });
      } else {
        sessionCache.delete(uid);
      }
      return data;
    })
    .finally(() => {
      inFlightReads.delete(uid);
    });

  inFlightReads.set(uid, promise);
  return promise;
}

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

async function markSessionExpired(uid) {
  const ref = getCollection().doc(uid);
  try {
    await ref.update({
      status: "expired",
      updatedAt: getServerTimestamp(),
    });
  } catch (err) {
    if (isNotFoundError(err)) {
      sessionCache.delete(uid);
      return;
    }
    throw err;
  }

  sessionCache.delete(uid);
}

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
