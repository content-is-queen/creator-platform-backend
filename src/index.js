const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const fileUploader = require("express-fileupload");
const router = require("./restful/routes");

dotenv.config();

const PORT = 5000;
const app = express();
app.use(cors());
app.use(express.json());

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

module.exports = app;
