const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

dotenv.config();

// Mock transporter that does nothing but returns a resolved promise
const transporter = {
  sendMail: () => Promise.resolve({ response: "Email sending is disabled" }),
};

module.exports = transporter;
