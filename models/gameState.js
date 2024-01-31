const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema({
  roomId: String,
  gameState: Object,
});

const Game = mongoose.model("Game", gameSchema);

module.exports = Game;