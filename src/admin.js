const dotenv = require("dotenv");

dotenv.config();

const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT),
  ),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

module.exports = admin;
