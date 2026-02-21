const dotenv = require("dotenv");

dotenv.config();

const firebaseAdmin = require("firebase-admin");

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(
    JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT),
  ),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

module.exports = firebaseAdmin;
