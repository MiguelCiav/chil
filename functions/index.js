const admin = require("firebase-admin");

admin.initializeApp();

const { saveScraperSession } = require("./handlers/saveScraperSession");
const { getScraperSessionStatus } = require("./handlers/getScraperSessionStatus");
const { clearScraperSession } = require("./handlers/clearScraperSession");
const { getMemberStatus } = require("./handlers/getMemberStatus");

exports.saveScraperSession = saveScraperSession;
exports.getScraperSessionStatus = getScraperSessionStatus;
exports.clearScraperSession = clearScraperSession;
exports.getMemberStatus = getMemberStatus;
