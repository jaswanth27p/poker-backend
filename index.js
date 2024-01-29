const express = require("express");
const cors = require("cors");
const { initializeSocket } = require("./services/socket");
const mongoose = require("./config");

const app = express();
const port = 5000;
const corsOptions = {
  origin: "*",
  credentials: true,
};
app.use(cors(corsOptions));

const io = initializeSocket(app);

io.listen(port, () => {
  console.log(`App listening on port ${port}`);
});