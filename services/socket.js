const http = require("http");
const socketIO = require("socket.io");
const Room = require("../models/room");
const Poker = require("./poker");
const Game = require("../models/gameState");

async function getGameState(roomId) {
  try {
    const game = await Game.findOne({ roomId: roomId });
    if (!game) {
      throw new Error(`Game state not found for room ${roomId}`);
    }
    const pokerInstance = Poker.recreateInstance(game.gameState);
    return pokerInstance;
  } catch (error) {
    console.error("Error fetching game state:", error);
    return null;
  }
}

async function saveGameState(roomId, gameState) {
  try {
    await Game.findOneAndUpdate(
      { roomId: roomId },
      { roomId: roomId, gameState: gameState },
      { upsert: true }
    );
  } catch (error) {
    console.error("Error saving game state:", error);
  }
}

function initializeSocket(app) {
  const server = http.createServer(app);
  const io = socketIO(server, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    socket.on("join_room", async ({ roomId, userId }) => {
      socket.join(roomId);

      try {
        const room = await Room.findOne({ roomId: roomId });
        if (room) {
          const userList = room.users;
          const userNames = room.userNames;
          io.to(roomId).emit("user_list", { userList, userNames });
        }
        let game = getGameState(roomId);
        if (game) {
          io.to(roomId).emit("game_state", {
            players: game.players,
            communityCards: game.communityCards,
            currentPlayerIndex: game.currentPlayerIndex,
            pot: game.pot,
            smallBlindIndex: game.smallBlindIndex,
          });
        }
      } catch (error) {
        console.error("Error fetching game:", error);
      }
    });

    socket.on("chat_message", async ({ userName, userId, roomId, message }) => {
      const ChatMessage = userName + " : " + message;
      console.log(ChatMessage);
      io.to(roomId).emit("chat_message", ChatMessage);
    });

    socket.on("game_log", ({ roomId, log }) => {
      io.to(roomId).emit("game_log", log);
    });

    socket.on("kick_out", async ({ userId, roomId }) => {
      const user = userId;
      io.to(roomId).emit("kicked_out", { user });
      let game = await getGameState(roomId);
      if (game) {
        game.players = game.players.filter((player) => player.id !== userId);

        if (game.players.length < 2) {
          game.resetGame();
        }
        saveGameState(roomId, game);
        io.to(roomId).emit("game_state", {
          players: game.players,
          communityCards: game.communityCards,
          currentPlayerIndex: game.currentPlayerIndex,
          pot: game.pot,
          smallBlindIndex: game.smallBlindIndex,
        });
      }
    });

    socket.on("start_game", async ({ roomId }) => {
      const room = await Room.findOne({ roomId: roomId });
      const userList = room.users;
      const userNames = room.userNames;
      let game = await getGameState(roomId);
      if (!game) {
        game = new Poker();
        if (userList && userList.length > 1) {
          game.startGame(userList, userNames);
          saveGameState(roomId, game);
          io.to(roomId).emit("game_state", {
            players: game.players,
            communityCards: game.communityCards,
            currentPlayerIndex: game.currentPlayerIndex,
            pot: game.pot,
            smallBlindIndex: game.smallBlindIndex,
          });
        }
      } else {
        game.players = game.players.filter((player) =>
          userList.some((user) => user === player.id)
        );
        const newPlayers = userList.filter(
          (user) => !game.players.some((player) => player.id === user)
        );
        const newPlayersNames = userNames.filter(
          (user) => !game.players.some((player) => player.name === user)
        );

        for (i = 0; i < newPlayers.length; i++) {
          game.addPlayer(newPlayers[i], newPlayersNames[i]);
        }

        game.resetGame();
        saveGameState(roomId, game);
        io.to(roomId).emit("game_state", {
          players: game.players,
          communityCards: game.communityCards,
          currentPlayerIndex: game.currentPlayerIndex,
          pot: game.pot,
          smallBlindIndex: game.smallBlindIndex,
        });
      }
    });

    socket.on("player_action", async ({ roomId, userId, action, callBet }) => {
      let game = await getGameState(roomId);
      if (
        game.players[game.currentPlayerIndex].id == userId &&
        game.winnerInfo != ""
      ) {
        game.handleActions(action, callBet);
      }

      if (game.winner != "") {
        io.to(roomId).emit("winner", {
          winner: game.winner,
        });
        const room = await Room.findOne({ roomId: roomId });
        const userList = room.users;
        const userNames = room.userNames;
        game.players = game.players.filter((player) =>
          userList.some((user) => user === player.id)
        );
        const newPlayers = userList.filter(
          (user) => !game.players.some((player) => player.id === user)
        );
        const newPlayersNames = userNames.filter(
          (user) => !game.players.some((player) => player.name === user)
        );
        for (i = 0; i < newPlayers.length; i++) {
          game.addPlayer(newPlayers[i], newPlayersNames[i]);
        }
        game.winner = "";
      }

      saveGameState(roomId, game);
      io.to(roomId).emit("game_state", {
        players: game.players,
        communityCards: game.communityCards,
        currentPlayerIndex: game.currentPlayerIndex,
        pot: game.pot,
        smallBlindIndex: game.smallBlindIndex,
      });
    });

    socket.on("reset_game", async ({ roomId }) => {
      console.log("called");
      let game = await getGameState(roomId);
      game.resetGame();
      saveGameState(roomId, game);
      io.to(roomId).emit("game_state", {
        players: game.players,
        communityCards: game.communityCards,
        currentPlayerIndex: game.currentPlayerIndex,
        pot: game.pot,
        smallBlindIndex: game.smallBlindIndex,
      });
    });

    socket.on("get_game_state", async ({ roomId }) => {
      let game = await getGameState(roomId);
      if (game) {
        io.to(roomId).emit("game_state", {
          players: game.players,
          communityCards: game.communityCards,
          currentPlayerIndex: game.currentPlayerIndex,
          pot: game.pot,
          smallBlindIndex: game.smallBlindIndex,
        });
      }
    });

    socket.on("timer", async ({ roomId, prevCount }) => {
      io.to(roomId).emit("game_state", { prevCount });
    });
    
  });

  return io;
}

module.exports = { initializeSocket };
