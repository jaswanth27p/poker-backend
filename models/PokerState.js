const mongoose = require("mongoose");

const pokerStateSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
  },
  state: {
    type: Object,
    required: true,
  },
});

const PokerState = mongoose.model("PokerState", pokerStateSchema);

module.exports = PokerState;
