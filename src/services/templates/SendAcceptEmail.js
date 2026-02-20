const dotenv = require("dotenv");

dotenv.config();

const sendAcceptEmail = (name) => {
  const { opportunityTitle, firstName } = name;
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
        color: #ffffff;
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
        <p>Hello, ${firstName}</p>
        <p>We are pleased to inform you that your application for ${opportunityTitle} to the Creator Platform has been successfully reviewed and accepted. Congratulations!</p>
      </div>
  
      <div class="content">
        <p>Please log in to your account to view the details of your allocation. If you have any questions or need further assistance, contact us at <strong>support@contentisqueen.com</strong> We're here to support you.</p>
  
        <p>Best regards,</p>
        <p>Creator Platform Team</p>
      </div>
    </div>
  </body>
  
  </html>`;
};

module.exports.sendAcceptEmail = sendAcceptEmail;
