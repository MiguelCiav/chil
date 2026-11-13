const { getAdmin, getFirestore } = require("./firebaseAdmin");

const COLLECTION_NAME = "scraper_sessions";

function getCollection() {
  return getFirestore().collection(COLLECTION_NAME);
}

function getServerTimestamp() {
  return getAdmin().firestore.FieldValue.serverTimestamp();
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
}

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

async function markSessionExpired(uid) {
  const ref = getCollection().doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    return;
  }

  await ref.update({
    status: "expired",
    updatedAt: getServerTimestamp(),
  });
}

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
