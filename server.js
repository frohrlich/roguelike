/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const express = require("express");

require('dotenv').config();


const app = express();
const HTML_FILE = path.join(__dirname, "public/index.html");

app.use(express.static("./"));
app.get("*", (req, res) => {
  res.sendFile(HTML_FILE);
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Running on port ${PORT}`);
});
