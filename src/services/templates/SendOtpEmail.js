const dotenv = require("dotenv");

dotenv.config();

const sendOtpEmail = (emailData) => {
  const otp = `${emailData.otp}`;
  return `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href='https://fonts.googleapis.com/css?family=Poppins' rel='stylesheet'>
      <title>Creator Platform</title>
      <style>
          * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
          }
          body {
              font-family: 'Poppins', sans-serif;
              background-color: #f2f2f2;
          }
          .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 10px;
              box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          }
          .logo {
              text-align: center;
          }
          .logo img {
              width: 100%;
              height: auto;
          }
          .content {
              color: #121111;
             padding: 20px;
          }
          .button {
              display: inline-block;
              background-color: #3677ed;
              color: #ffffff !important;
              padding: 10px 20px;
              border-radius: 5px;
              text-decoration: none;
              margin-top: 20px;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="logo">
              <img src="https://media.licdn.com/dms/image/D4E3DAQFc-hrExVgIUg/image-scale_191_1128/0/1707842351543/content_is_queen_podcasts_cover?e=2147483647&v=beta&t=etcyrsZcy5eBtGjVp18vW4aQXkHiNWU0rBY357UqjQg" alt="Logo">
          </div>
          <div class="content">
              <p>Hello ${emailData.name},</p>
              <p> we kindly request you to verify your email address.
  
  Please copy or click to the following OTP (One-Time Password) to verify your email:</p>
          </div>
          <div class="button-container" style="text-align: center;">
              <a class="button" href="${process.env.DOMAIN}/verify?otp=${otp}"><b>${otp}</b></a>
          </div>
          <div class="content">
              <p>Thank you for choosing Creator Platform. We look forward to having you as part of our community.</p>
            <p>Best regards</p>
              <p>Creator Platform Team</p>
          </div>
      </div>
  </body>
  </html>`;
};

module.exports.sendOtpEmail = sendOtpEmail;
