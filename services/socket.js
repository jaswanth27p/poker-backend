const http = require("http");
const socketIO = require("socket.io");
const ChatMessage = require("../models/chatMessage");
const Room = require("../models/room");
const Poker = require("./poker");

const games = {};

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
          io.to(roomId).emit("user_list", {userList,userNames});
        }

        if (games[roomId]) {
          const game = games[roomId];
          io.to(roomId).emit("game_state", {
            players: game.players,
            communityCards: game.communityCards,
            currentPlayerIndex: game.currentPlayerIndex,
            pot: game.pot,
            smallBlindIndex: game.smallBlindIndex,
          });
        }
      } catch (error) {
        console.error("Error fetching chat history:", error);
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
      if (games[roomId]) {
        const game = games[roomId];
        game.players = game.players.filter((player) => player.id !== userId);

        if (game.players.length < 2) {
          game.resetGame();
        }

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
      if (!games[roomId]) {
        games[roomId] = new Poker();
        if (userList && userList.length > 1) {
          games[roomId].startGame(userList,userNames);
          const game = games[roomId];
          io.to(roomId).emit("game_state", {
            players: game.players,
            communityCards: game.communityCards,
            currentPlayerIndex: game.currentPlayerIndex,
            pot: game.pot,
            smallBlindIndex: game.smallBlindIndex,
          });
        }
      } else {
        games[roomId].players = games[roomId].players.filter((player) =>
          userList.some((user) => user === player.id)
        );
        const newPlayers = userList.filter(
          (user) =>
            !games[roomId].players.some((player) => player.id === user)
        );
        const newPlayersNames = userList.filter(
          (user) => !games[roomId].players.some((player) => player.name === user)
        );

        for (i=0;i<newPlayers.length;i++){
          games[roomId].addPlayer(newPlayers[i],newPlayersNames[i])
        }

        games[roomId].resetGame();
        const game = games[roomId];
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
      if (
        games[roomId].players[games[roomId].currentPlayerIndex].id == userId
      ) {
        games[roomId].handleActions(action, callBet);
      }

      if (games[roomId].winner != "") {
        io.to(roomId).emit("winner", {
          winner: games[roomId].winner,
        });
        const room = await Room.findOne({ roomId: roomId });
        const userList = room.users;
        games[roomId].players = games[roomId].players.filter((player) =>
          userList.some((user) => user === player.id)
        );
        const newPlayers = userList.filter(
          (user) => !games[roomId].players.some((player) => player.id === user)
        );
        const newPlayersNames = userList.filter(
          (user) =>
            !games[roomId].players.some((player) => player.name === user)
        );
        for (i = 0; i < newPlayers.length; i++) {
          games[roomId].addPlayer(newPlayers[i], newPlayersNames[i]);
        }
        games[roomId].resetGame();
      }
      const game = games[roomId];

      io.to(roomId).emit("game_state", {
        players: game.players,
        communityCards: game.communityCards,
        currentPlayerIndex: game.currentPlayerIndex,
        pot: game.pot,
        smallBlindIndex: game.smallBlindIndex,
      });
    });
  });

  return io;
}

module.exports = { initializeSocket, games };
