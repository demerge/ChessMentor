/** Compact puzzle bank for academy practice (FEN + solution UCI) */

export type Puzzle = {
  fen: string;
  playerColor: "white" | "black";
  solutionUci: string[];
  hint: string;
  goal: string;
  tag: string;
};

export const PUZZLES: Record<string, Puzzle[]> = {
  hanging: [
    {
      fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
      playerColor: "white",
      solutionUci: ["f3f7"],
      hint: "Look at f7 — the queen eyes a weak square.",
      goal: "Spot the hanging/weak f7 and punish it (Scholar-style idea).",
      tag: "hanging",
    },
  ],
  fork: [
    {
      fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
      playerColor: "white",
      solutionUci: ["h5f7"],
      hint: "The queen can attack king and rook ideas on the kingside.",
      goal: "Deliver a double attack (fork-style pressure on f7).",
      tag: "fork",
    },
    {
      fen: "rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
      playerColor: "white",
      solutionUci: ["f3e5"],
      hint: "A central capture may leave a knight forking later — calculate Nxe5.",
      goal: "Use the knight for a double-attack sequence.",
      tag: "fork",
    },
  ],
  pin: [
    {
      fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
      playerColor: "white",
      solutionUci: ["f3g5"],
      hint: "Pin or pressure the f7 complex with piece activity.",
      goal: "Create or exploit a pin on the kingside.",
      tag: "pin",
    },
  ],
  skewer: [
    {
      fen: "4k3/8/8/8/8/8/4R3/4K2r w - - 0 1",
      playerColor: "white",
      solutionUci: ["e2e8"],
      hint: "Align rook with king and the hanging rook behind.",
      goal: "Skewer the king against the rook.",
      tag: "skewer",
    },
  ],
  discovered_attack: [
    {
      fen: "rnbqkbnr/ppp2ppp/8/3pp3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3",
      playerColor: "white",
      solutionUci: ["f3e5"],
      hint: "Moving the knight may discover attacks from pieces behind.",
      goal: "Find a discovered / double-attack idea in the center.",
      tag: "discovered_attack",
    },
  ],
  back_rank: [
    {
      fen: "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1",
      playerColor: "white",
      solutionUci: ["a1a8"],
      hint: "The king has no luft — the back rank is weak.",
      goal: "Deliver back-rank mate.",
      tag: "back_rank",
    },
  ],
  smothered_mate: [
    {
      fen: "6rk/6pp/8/6N1/8/8/6PP/6K1 w - - 0 1",
      playerColor: "white",
      solutionUci: ["g5f7"],
      hint: "Knight check when the king is boxed by its own pieces.",
      goal: "Approach a smothered mate pattern.",
      tag: "smothered_mate",
    },
  ],
  endgame_opposition: [
    {
      fen: "8/8/4k3/8/4K3/8/8/8 w - - 0 1",
      playerColor: "white",
      solutionUci: ["e4e5"],
      hint: "Take the opposition — face the king with a file between.",
      goal: "Seize the opposition.",
      tag: "opposition",
    },
  ],
  lucena: [
    {
      fen: "1K6/1P6/8/8/8/8/6r1/1k6 w - - 0 1",
      playerColor: "white",
      solutionUci: ["b8a7"],
      hint: "Lucena ideas: bridge-building starts by improving the king.",
      goal: "Start the Lucena technique (king out).",
      tag: "lucena",
    },
  ],
  foundation_hanging: [
    {
      fen: "rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
      playerColor: "white",
      solutionUci: ["e4d5"],
      hint: "Is the d5 pawn defended enough?",
      goal: "Capture a hanging or under-defended pawn.",
      tag: "hanging",
    },
  ],
  calculation: [
    {
      fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5",
      playerColor: "white",
      solutionUci: ["c4f7"],
      hint: "Calculate checks and captures first — CCT.",
      goal: "Find the strongest forcing move.",
      tag: "calculation",
    },
  ],
};

export function puzzlesForTag(tag: string, n = 3): Puzzle[] {
  const list = PUZZLES[tag] ?? PUZZLES.fork;
  return list.slice(0, n);
}

export function allPuzzleTags(): string[] {
  return Object.keys(PUZZLES);
}
