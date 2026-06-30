const admin = require("firebase-admin");

admin.initializeApp();

const { loginScraper } = require("./handlers/loginScraper");
const { getMemberStatus } = require("./handlers/getMemberStatus");

exports.loginScraper = loginScraper;
exports.getMemberStatus = getMemberStatus;
