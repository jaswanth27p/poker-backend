const PokerSolver = require("pokersolver");
class Poker {
  static recreateInstance(serializedState) {
    const poker = new Poker();
    poker.players = serializedState.players;
    poker.communityCards = serializedState.communityCards;
    poker.deck = serializedState.deck;
    poker.currentPlayerIndex = serializedState.currentPlayerIndex;
    poker.pot = serializedState.pot;
    poker.smallBlindIndex = serializedState.smallBlindIndex;
    poker.bigBlindIndex = serializedState.bigBlindIndex;
    poker.currentBettingRound = serializedState.currentBettingRound;
    poker.winner = serializedState.winner;
    return poker;
  }

  constructor() {
    this.players = [];
    this.deck = [];
    this.communityCards = [];
    this.currentPlayerIndex = 0;
    this.pot = 0;
    this.smallBlindIndex = 0;
    this.bigBlindIndex = 1;
    this.currentBettingRound = 0;
    this.winner = "";
    this.initializeDeck();
  }

  initializeDeck() {
    const suits = ["Hearts", "Diamonds", "Clubs", "Spades"];
    const ranks = [
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "J",
      "Q",
      "K",
      "A",
    ];

    for (const suit of suits) {
      for (const rank of ranks) {
        this.deck.push({ suit, rank });
      }
    }
    this.shuffleDeck();
  }

  shuffleDeck() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  initializePlayers(users, userNames) {
    for (let i = 0; i < users.length; i++) {
      this.addPlayer(users[i], userNames[i]);
    }
  }

  addPlayer(id, name) {
    this.players.push({
      id,
      name,
      hand: [],
      chips: 1000,
      bet: 0,
      inGame: false,
      lastAction: null,
    });
  }

  startGame(user_list, userNames) {
    this.initializePlayers(user_list, userNames);
    this.players.forEach((player) => {
      player.inGame = true;
    });
    this.collectBlinds(this.smallBlindIndex);
    this.dealInitialCards();
  }

  collectBlinds(startingIndex) {
    const smallBlindPlayer = this.players[startingIndex];
    const bigBlindPlayer =
      this.players[(startingIndex + 1) % this.players.length];
    this.currentPlayerIndex = (startingIndex + 2) % this.players.length;
    this.collectBet(smallBlindPlayer, 10);
    this.collectBet(bigBlindPlayer, 20);
  }

  collectBet(player, amount) {
    if (player.chips >= amount) {
      player.chips -= amount;
      player.bet += amount;
      this.pot += amount;
      player.lastBet = amount;
      console.log(`${player.name} bets ${amount} chips.`);
    } else {
      this.foldPlayer(player);
    }
  }

  dealInitialCards() {
    for (let i = 0; i < 2; i++) {
      for (const player of this.players) {
        player.hand.push(this.deck.pop());
      }
    }
  }

  dealCommunityCards(count) {
    for (let i = 0; i < count; i++) {
      this.communityCards.push(this.deck.pop());
    }
    console.log(`Community cards: ${JSON.stringify(this.communityCards)}`);
  }

  handleActions(action, callBet) {
    if (action == "fold") {
      this.players[this.currentPlayerIndex].inGame = false;
    } else if (action == "call") {
      this.players[this.currentPlayerIndex].chips -= callBet;
      this.pot += callBet;
      this.players[this.currentPlayerIndex].bet += callBet;
      this.players[this.currentPlayerIndex].lastAction = "call";
    } else if (action == "raise") {
      this.players[this.currentPlayerIndex].chips -= callBet + 10;
      this.pot += callBet + 10;
      this.players[this.currentPlayerIndex].bet += callBet + 10;
      this.players[this.currentPlayerIndex].lastAction = "raise";
    }

    if (this.isBettingRoundCompleted()) {
      this.endBettingRound();
    } else {
      this.nextPlayer();
    }
  }

  isBettingRoundCompleted() {
    console.log("called betting round check");
    const activePlayers = this.players.filter((player) => player.inGame);

    if (activePlayers) {
      if (
        activePlayers.every(
          (player) =>
            player.lastAction === "call" || player.lastAction === "raise"
        )
      ) {
        let firstBet;
        if (activePlayers[0]) {
          firstBet = activePlayers[0].bet;
        } else {
          firstBet = 0;
        }

        return activePlayers.every((player) => player.bet === firstBet);
      }
    }
    return false;
  }

  endBettingRound() {
    console.log("called end betting " + this.currentBettingRound);
    this.players.forEach((player) => {
      player.lastAction = null;
      player.bet = 0;
    });
    const activePlayersCount = this.players.filter(
      (player) => player.inGame
    ).length;
    if (activePlayersCount < 2) {
      this.evaluateWinner();
    }
    this.currentBettingRound += 1;
    if (this.currentBettingRound == 1) {
      this.dealCommunityCards(3);
    } else if (this.currentBettingRound < 4) {
      this.dealCommunityCards(1);
    } else {
      this.evaluateWinner();
    }

    this.currentPlayerIndex = this.smallBlindIndex;
  }

  nextPlayer() {
    const activePlayersCount = this.players.filter(
      (player) => player.inGame
    ).length;
    if (activePlayersCount < 2) {
      this.evaluateWinner();
    }
    let nextIndex = (this.currentPlayerIndex + 1) % this.players.length;
    while (!this.players[nextIndex].inGame) {
      nextIndex = (nextIndex + 1) % this.players.length;
    }
    this.currentPlayerIndex = nextIndex;
  }

  evaluateWinner() {
    const activePlayers = this.players.filter((player) => player.inGame);

    if (activePlayers.length === 1) {
      const winner = activePlayers[0];
      console.log(`Game ended. ${winner.name} is the winner`);
      winner.chips += this.pot;
      this.winner = winner;
    } else {
      console.log(`Community cards: ${JSON.stringify(this.communityCards)}`);
      activePlayers.forEach((player) => {
        const playerCards = player.hand.map(
          (card) => card.rank + card.suit.charAt(0).toLowerCase()
        );
        const communityCards = this.communityCards.map(
          (card) => card.rank + card.suit.charAt(0).toLowerCase()
        );
        const allCards = [...playerCards, ...communityCards];

        const hand = PokerSolver.Hand.solve(allCards);
        console.log(`${player.name}'s hand: ${hand.toString()}`);
        player.handInfo = hand;
      });

      const bestHands = activePlayers.map((player) => player.handInfo);
      const winners = PokerSolver.Hand.winners(bestHands);

      if (winners.length === 1) {
        const winner = activePlayers.find(
          (player) => player.handInfo === winners[0]
        );
        console.log(
          `Game ended. ${winner.name} is the winner with ${winner.handInfo.name}!`
        );
        winner.chips += this.pot;
        this.winner = winner;
      } else {
        console.log("It's a tie!");
        const potPerWinner = Math.floor(this.pot / winners.length);
        winners.forEach((winnerInfo) => {
          const winner = activePlayers.find(
            (player) => player.handInfo === winnerInfo
          );
          console.log(
            `Dividing pot for ${winner.name} with ${winner.handInfo.name}!`
          );
          winner.chips += potPerWinner;
        });
      }
    }
  }

  resetGame() {
    this.deck = [];
    this.communityCards = [];
    this.smallBlindIndex = (this.smallBlindIndex + 1) % this.players.length;
    this.bigBlindIndex = (this.smallBlindIndex + 1) % this.players.length;
    this.currentPlayerIndex = this.smallBlindIndex;
    this.pot = 0;
    this.currentBettingRound = 0;
    this.winner = "";
    this.initializeDeck();

    // Clear player-specific game-related data
    this.players.forEach((player) => {
      player.hand = [];
      player.bet = 0;
      player.inGame = true;
      player.lastAction = null;
    });
    if (this.players.length > 1) {
      this.collectBlinds(this.smallBlindIndex);
      this.dealInitialCards();
    }
  }
}

module.exports = Poker;
