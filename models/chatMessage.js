// models/chatMessage.js
const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  room: String,
  user: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
});

const ChatMessage = mongoose.model("ChatMessage", chatSchema);

module.exports = ChatMessage;
