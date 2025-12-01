import { EventEmitter } from "events";
import { Hand } from "pokersolver";

// --------------------- CONSTANTES ---------------------
const SUITS = ["h", "d", "c", "s"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
const MIN_TIMEOUT = 1000; // ms
const MAX_TIMEOUT = 3000; // ms

// --------------------- TYPES ---------------------
interface GameState {
  round: string;
  pot: number;
  bigBlind: number;
  playerStack: number;
}

interface Action {
  action: string;
  amount: number;
  crazy?: boolean;
}

// --------------------- POKERBOT ---------------------
class PokerBot {
  name: string;
  stack: number;
  holeCards: string[];
  personality: string;
  bluffLevel: number;
  status: string;
  playerHistory: string[];
  lastTimeout: number;

  constructor(name: string, stack: number, personality: string, bluffLevel = 0.2) {
    this.name = name;
    this.stack = stack;
    this.holeCards = [];
    this.personality = personality;
    this.bluffLevel = bluffLevel;
    this.status = "active"; // active / folded
    this.playerHistory = [];
    this.lastTimeout = 0;
  }

  setCards(cards: string[]): void {
    this.holeCards = cards;
    this.status = "active";
  }

  addPlayerAction(action: string): void {
    this.playerHistory.push(action);
    if (this.playerHistory.length > 5) this.playerHistory.shift();
  }

  async randomTimeout(): Promise<void> {
    const timeout = MIN_TIMEOUT + Math.random() * (MAX_TIMEOUT - MIN_TIMEOUT);
    this.lastTimeout = timeout;
    return new Promise((resolve) => setTimeout(resolve, timeout));
  }

  generateNarration(actionType: string, amount = 0): string {
    const emo =
      this.lastTimeout < 1500
        ? "semble confiant"
        : this.lastTimeout < 2500
          ? "réfléchit quelques instants"
          : "hésite longuement";
    switch (actionType) {
      case "fold":
        return `${this.name} ${emo} et se retire du coup.`;
      case "call":
        return `${this.name} ${emo} et suit la mise de ${amount}.`;
      case "raise":
        return `${this.name} ${emo} et mise ${amount}.`;
      case "crazy":
        return `${this.name} ${emo} et fait un move audacieux de ${amount} !`;
      default:
        return "";
    }
  }

  async decide(gameState: GameState, board: string[], bigBlind: number): Promise<Action> {
    await this.randomTimeout();
    if (this.status === "folded" || this.stack <= 0) return { action: "fold", amount: 0 };

    const handStrength = Hand.solve([...this.holeCards, ...board]).rank;
    const potFactor = this.stack / (gameState.pot || 1);
    let doBluff = Math.random() < this.bluffLevel;
    const recentActions = this.playerHistory.slice(-3);
    if (recentActions.filter((a) => a === "raise").length >= 2) doBluff = false;

    let action: Action = { action: "fold", amount: 0, crazy: false };

    switch (this.personality) {
      case "aggressive":
        if (handStrength >= 2 || potFactor > 2)
          action = { action: "raise", amount: Math.min(this.stack, gameState.pot || bigBlind * 2) };
        else action = { action: "call", amount: Math.min(this.stack, bigBlind) };
        break;
      case "cautious":
        if (handStrength >= 5 && potFactor <= 2)
          action = { action: "raise", amount: Math.min(this.stack, bigBlind * 2) };
        else if (handStrength >= 2 || potFactor < 1)
          action = { action: "call", amount: Math.min(this.stack, bigBlind) };
        else action = { action: "fold", amount: 0 };
        break;
      case "pairlover":
        const ranks = this.holeCards.map((c) => c[0]);
        if (ranks[0] === ranks[1])
          action = { action: "raise", amount: Math.min(this.stack, bigBlind * 3) };
        else if (handStrength >= 2)
          action = { action: "call", amount: Math.min(this.stack, bigBlind) };
        break;
      case "random":
        const acts = ["fold", "call", "raise"];
        const a = acts[Math.floor(Math.random() * acts.length)];
        if (a === "raise")
          action = {
            action: "raise",
            amount: Math.min(this.stack, bigBlind * (1 + Math.floor(Math.random() * 3))),
          };
        else action = { action: a, amount: Math.min(this.stack, bigBlind) };
        break;
      case "balanced":
        if (handStrength >= 5)
          action = { action: "raise", amount: Math.min(this.stack, bigBlind * 2) };
        else if (handStrength >= 2)
          action = { action: "call", amount: Math.min(this.stack, bigBlind) };
        else action = { action: "fold", amount: 0 };
        break;
      case "bluffer":
        doBluff = true;
        action = {
          action: "raise",
          amount: Math.min(this.stack, bigBlind * (2 + Math.floor(Math.random() * 3))),
          crazy: true,
        };
        break;
    }

    if (doBluff && action.action !== "fold") action.crazy = true;
    return action;
  }
}

// --------------------- POKERENGINE ---------------------
class PokerEngine extends EventEmitter {
  playerName: string;
  playerStack: number;
  playerStatus: string;
  pot: number;
  community: string[];
  holeCards: string[];
  bots: PokerBot[];
  deck: string[];
  bigBlind: number;
  round: string;
  smallBlindIndex: number;
  playerHistoryGlobal: { action: string; time: number }[];
  isPlayerTurn: boolean; // New property to track if it's the player's turn

  constructor(playerName: string, playerStack = 1000, bigBlind = 20) {
    super();
    this.playerName = playerName;
    this.playerStack = playerStack;
    this.playerStatus = "active";
    this.pot = 0;
    this.community = [];
    this.holeCards = [];
    this.bots = [];
    this.deck = [];
    this.bigBlind = bigBlind;
    this.round = "preflop";
    this.smallBlindIndex = 0;
    this.playerHistoryGlobal = [];
    this.isPlayerTurn = false; // Initialize as false
  }

  addBot(bot: PokerBot): void {
    this.bots.push(bot);
  }

  initDeck(): void {
    this.deck = [];
    for (const s of SUITS) for (const r of RANKS) this.deck.push(r + s);
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  drawCards(n: number): string[] {
    return this.deck.splice(0, n);
  }

  describeHand(cards: string[], board: string[]): string {
    return Hand.solve([...cards, ...board]).descr;
  }

  async play(action: string): Promise<void> {
    if (!this.isPlayerTurn) {
      throw new Error("Ce n'est pas votre tour de jouer.");
    }

    const options = ["fold", "call", "raise"];
    if (!options.includes(action)) {
      throw new Error(`Invalid action: ${action}. Valid options are: ${options.join(", ")}`);
    }

    if (action === "fold") {
      this.playerStatus = "folded";
    } else if (action === "call") {
      const callAmount = Math.min(this.bigBlind, this.playerStack);
      this.playerStack -= callAmount;
      this.pot += callAmount;
    } else if (action === "raise") {
      const raiseAmount = Math.min(this.bigBlind * 2, this.playerStack);
      this.playerStack -= raiseAmount;
      this.pot += raiseAmount;
    }

    if (this.playerStack <= 0) {
      this.playerStatus = "eliminated";
      this.emit("action", `${this.playerName} n'a plus de jetons et est éliminé.`);
    }

    this.emit("potUpdate", `Pot: ${this.pot} | Stack joueur: ${this.playerStack}`);
    this.bots.forEach((b) => b.addPlayerAction(action));

    this.isPlayerTurn = false; // Set to false after the player plays
  }

  parseCard(card: string): string {
    const suitSymbols: { [key: string]: string } = {
      h: '♥',
      d: '♦',
      c: '♣',
      s: '♠'
    };

    const rank = card[0];
    const suit = card[1];
    const suitSymbol = suitSymbols[suit] || '';

    return `${rank}${suitSymbol}`;
  }

  async start(): Promise<void> {
    this.initDeck();
    this.community = [];
    this.pot = 0;
    this.holeCards = this.drawCards(2);
    this.bots.forEach((b) => b.setCards(this.drawCards(2)));

    const parsedHoleCards = this.holeCards.map(this.parseCard).join(', ');
    this.emit("action", `${this.playerName} reçoit ses cartes: ${parsedHoleCards}`);

    // ---------------- Ordre des joueurs selon blinds ----------------
    const playersOrder = [this.playerName, ...this.bots.map((b) => b.name)];
    const orderLength = playersOrder.length;
    const smallBlindIdx = this.smallBlindIndex % orderLength;
    const bigBlindIdx = (this.smallBlindIndex + 1) % orderLength;
    const firstPlayerIdx = (bigBlindIdx + 1) % orderLength;

    const actionOrder: string[] = [];
    for (let i = 0; i < orderLength; i++) {
      actionOrder.push(playersOrder[(firstPlayerIdx + i) % orderLength]);
    }

    this.emit("action", `Petit blind: ${playersOrder[smallBlindIdx]}, Grand blind: ${playersOrder[bigBlindIdx]}`);

    const rounds = ["preflop", "flop", "turn", "river"];
    for (const r of rounds) {
      this.round = r;
      if (r !== "preflop") {
        const draw = r === "flop" ? this.drawCards(3) : this.drawCards(1);
        this.community.push(...draw);
        this.emit("action", `Board (${r}): ${this.community.join(", ")}`);
      }

      for (const player of actionOrder) {
        if (player === this.playerName && this.playerStatus === "active") {
          this.isPlayerTurn = true; // Set to true when it's the player's turn
          this.emit("playerTurn", { player: this.playerName, community: this.community, pot: this.pot });
          await new Promise((resolve) => {
            const interval = setInterval(() => {
              if (!this.isPlayerTurn) {
                clearInterval(interval);
                resolve(null);
              }
            }, 100);
          });
        } else {
          const bot = this.bots.find((b) => b.name === player);
          if (!bot || bot.status === "folded" || bot.stack <= 0) continue;
          const action = await bot.decide(
            { round: this.round, pot: this.pot, bigBlind: this.bigBlind, playerStack: this.playerStack },
            this.community,
            this.bigBlind
          );
          if (action.action === "fold") {
            bot.status = "folded";
            this.emit("action", bot.generateNarration("fold"));
          } else if (action.action === "call") {
            const amount = Math.min(bot.stack, action.amount || this.bigBlind);
            bot.stack -= amount;
            this.pot += amount;
            this.emit("action", bot.generateNarration("call", amount));
          } else if (action.action === "raise") {
            const amount = Math.min(bot.stack, action.amount || this.bigBlind * 2);
            bot.stack -= amount;
            this.pot += amount;
            this.emit(
              "action",
              action.crazy
                ? bot.generateNarration("crazy", amount)
                : bot.generateNarration("raise", amount)
            );
          }
        }
      }
    }

    // ---------------- Showdown ----------------
    const allHands = [
      { name: this.playerName, cards: this.holeCards, status: this.playerStatus },
      ...this.bots.map((b) => ({ name: b.name, cards: b.holeCards, status: b.status })),
    ];
    const activeHands = allHands.filter((h) => h.status === "active");
    if (activeHands.length === 0) {
      this.emit("showdown", "Tout le monde s'est couché. Pot partagé !");
      return;
    }

    const solvedHands = activeHands.map((h) => ({ name: h.name, hand: Hand.solve([...h.cards, ...this.community]) }));
    solvedHands.sort((a, b) => b.hand.rank - a.hand.rank);
    const winner = solvedHands[0];

    this.emit("action", `Votre main: ${this.describeHand(this.holeCards, this.community)}`);
    this.emit("showdown", `Showdown ! Board: ${this.community.join(", ")}`);
    this.emit("showdown", `Gagnant: ${winner.name} avec ${winner.hand.descr}. Pot: ${this.pot}`);

    if (winner.name === this.playerName) this.playerStack += this.pot;
    else {
      const botWinner = this.bots.find((b) => b.name === winner.name);
      if (botWinner) botWinner.stack += this.pot;
    }

    this.emit("potUpdate", `Stack final joueur: ${this.playerStack}`);
    this.smallBlindIndex = (this.smallBlindIndex + 1) % playersOrder.length;
  }

  async playSession(): Promise<void> {
    let handNum = 1;
    while (this.playerStack > 0 && this.bots.some((b) => b.stack > 0)) {
      console.log(`\n===== MAIN ${handNum} =====`);
      await this.start();

      // Attendre l'événement "nextHand" déclenché par le bouton "Relancer"
      await new Promise<void>((resolve) => {
        this.once("nextHand", () => {
          resolve();
        });
      });

      handNum++;
    }
    console.log("\n===== SESSION TERMINÉE =====");
    console.log(`Stack final joueur: ${this.playerStack}`);
    this.bots.forEach((b) => console.log(`Stack final ${b.name}: ${b.stack}`));
  }
}

// --------------------- EXPORT ---------------------
export { PokerBot, PokerEngine };
export const bots = [
  { name: "Blinky", personality: "pairHunter" },
  { name: "Inky", personality: "random" },
  { name: "Pinky", personality: "cautious" },
  { name: "Packy", personality: "bluffer" },
  { name: "Kacky", personality: "balanced" },
];
// ---------------- Exemple ----------------
export async function runSession(username: string, bet: number): Promise<PokerEngine> {
  const engine = new PokerEngine(username, bet, 20);

  engine.addBot(new PokerBot("Blinky", 500, "pairlover", 0.1));
  engine.addBot(new PokerBot("Pinky", 500, "random", 0.5));
  engine.addBot(new PokerBot("Inky", 500, "cautious", 0.2));
  engine.addBot(new PokerBot("Clyde", 500, "aggressive", 0.3));
  engine.addBot(new PokerBot("Packy", 500, "bluffer", 1));
  engine.addBot(new PokerBot("Kacky", 500, "balanced", 0.2)); // Kacky en balanced

  engine.on("action", console.log);
  engine.on("potUpdate", console.log);
  engine.on("showdown", console.log);

  await engine.playSession(); // Jouer jusqu’à élimination
  return engine;
}