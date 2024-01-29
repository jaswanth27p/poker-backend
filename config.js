const mongoose = require("mongoose");

mongoose.set("strictQuery", true);
mongoose.connect(
  `mongodb+srv://jaswanth27p:zXxw5yepW3DnM0kk@cluster0.3qne6tz.mongodb.net/game`
);

const db = mongoose.connection;

db.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

db.on("open", () => {
  console.log("Connected to MongoDB");
});

module.exports = mongoose;
