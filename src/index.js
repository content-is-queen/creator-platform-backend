const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { initializeApp, cert } = require("firebase-admin/app");
const fileUploader = require("express-fileupload");
const router = require("./restful/routes");
const {
  stripeEvent,
  resetUsersLimit,
  closeExpiredOpportunities,
} = require("../functions");

const serviceAccount = {
  type: "service_account",
  project_id: process.env.PROJECT_ID,
  private_key_id: process.env.PRIVATE_KEY_ID,
  private_key: process.env.PRIVATE_KEY,
  client_email: process.env.CLIENT_EMAIL,
  client_id: process.env.CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.CLIENT_X509_CERT_URL,
  universe_domain: "googleapis.com",
};

dotenv.config();

const PORT = process.env.PORT || 8080;
const app = express();
app.use(cors());
app.use(express.json());

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: `${process.env.PROJECT_ID}.appspot.com`,
});

app.use(
  fileUploader({
    fileSize: 50 * 1024 * 1024,
    useTempFiles: true,
    tempFileDir: "/tmp/",
  }),
);
app.use(router);
const start = () => {
  try {
    app.listen(PORT, () => console.log(`App listening on port ${PORT}`));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
};
start();

exports.closeExpiredOpportunities = closeExpiredOpportunities;

exports.resetUsersLimit = resetUsersLimit;

exports.stripeEvent = stripeEvent;

module.exports = app;
