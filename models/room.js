const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
  roomName: {
    type: String,
    required: true,
    unique: true,
  },
  roomPass: {
    type: String,
    required: true,
  },
  roomId: {
    type: String,
    required: true,
    unique: true,
  },
  owner: {
    type: String,
    required: true,
  },
  users: {
    type: [String],
    default: [],
  },
  userNames: {
    type: [String],
    default: [],
  },
});

 
module.exports = mongoose.models.Room || mongoose.model("Room", roomSchema);
