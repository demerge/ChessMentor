import type { ChessGame } from "@/engines/rules/game";
import { extractFeatures } from "./featureExtractor";

export type GamePhase = "opening" | "middlegame" | "endgame";

export interface PositionContext {
  phase: GamePhase;
  openingName: string;
  material: string;
  materialDiff: number;
  initiative: "White" | "Black" | "Balanced";
  kingSafety: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  pieceCount: number;
  inTheory: boolean;
}

const OPENING_BOOK: { moves: string[]; name: string }[] = [
  { moves: ["e4", "e5", "Nf3", "Nc6", "Bc4"], name: "Italian Game" },
  { moves: ["e4", "e5", "Nf3", "Nc6", "Bb5"], name: "Ruy Lopez" },
  { moves: ["e4", "c5"], name: "Sicilian Defence" },
  { moves: ["e4", "e6"], name: "French Defence" },
  { moves: ["e4", "c6"], name: "Caro-Kann" },
  { moves: ["d4", "d5", "c4"], name: "Queen's Gambit" },
  { moves: ["d4", "Nf6", "c4", "g6"], name: "King's Indian setup" },
  { moves: ["d4", "Nf6", "c4", "e6"], name: "Nimzo/Queen's Indian complex" },
  { moves: ["e4", "e5", "Nf3", "Nf6"], name: "Petrov Defence" },
  { moves: ["c4"], name: "English Opening" },
  { moves: ["Nf3"], name: "Réti / flexible" },
  { moves: ["e4"], name: "King's Pawn Game" },
  { moves: ["d4"], name: "Queen's Pawn Game" },
];

function countPieces(game: ChessGame): number {
  let n = 0;
  for (const f of "abcdefgh") {
    for (let r = 1; r <= 8; r++) {
      if (game.pieceAt(`${f}${r}`)) n++;
    }
  }
  return n;
}

function detectOpening(historySan: string[]): { name: string; inTheory: boolean } {
  if (historySan.length === 0) {
    return { name: "Starting position", inTheory: true };
  }
  let best: { name: string; len: number } | null = null;
  for (const entry of OPENING_BOOK) {
    if (entry.moves.length > historySan.length) continue;
    let ok = true;
    for (let i = 0; i < entry.moves.length; i++) {
      if (historySan[i] !== entry.moves[i]) {
        ok = false;
        break;
      }
    }
    if (ok && (!best || entry.moves.length > best.len)) {
      best = { name: entry.name, len: entry.moves.length };
    }
  }
  if (best) return { name: best.name, inTheory: historySan.length <= 12 };
  if (historySan.length <= 2) return { name: "Open game", inTheory: true };
  if (historySan.length <= 10) return { name: "Independent path", inTheory: false };
  return { name: "Out of book", inTheory: false };
}

export function getPositionContext(game: ChessGame): PositionContext {
  const pieces = countPieces(game);
  const moveNo = game.snapshot().moveNumber;
  const f = extractFeatures(game);
  const { name, inTheory } = detectOpening(game.historySan);

  let phase: GamePhase = "middlegame";
  if (pieces <= 10 || (pieces <= 12 && moveNo > 20)) phase = "endgame";
  else if (moveNo <= 12 && pieces >= 28) phase = "opening";

  const diff = f.materialWhite - f.materialBlack;
  let material = "Equal";
  if (diff >= 3) material = `White +${diff}`;
  else if (diff <= -3) material = `Black +${Math.abs(diff)}`;
  else if (diff > 0) material = `White +${diff} (slight)`;
  else if (diff < 0) material = `Black +${Math.abs(diff)} (slight)`;

  let initiative: PositionContext["initiative"] = "Balanced";
  if (f.centerControl > 0.8) initiative = "White";
  else if (f.centerControl < -0.8) initiative = "Black";
  else if (game.turn === "white" && f.hangingPieces.length > 0) initiative = "White";
  else if (game.turn === "black" && f.hangingPieces.length > 0) initiative = "Black";

  const wK = f.whiteKingSafety;
  const bK = f.blackKingSafety;
  let kingSafety = "Both solid";
  if (bK < wK - 2) kingSafety = "Black slightly exposed";
  else if (wK < bK - 2) kingSafety = "White slightly exposed";
  else if (bK < 1 && wK < 1) kingSafety = "Both under pressure";

  let difficulty: PositionContext["difficulty"] = "Intermediate";
  if (f.hangingPieces.length >= 2 || Math.abs(diff) >= 5) difficulty = "Advanced";
  else if (phase === "opening" && Math.abs(diff) === 0) difficulty = "Beginner";
  else if (phase === "endgame") difficulty = "Advanced";

  return {
    phase,
    openingName: name,
    material,
    materialDiff: diff,
    initiative,
    kingSafety,
    difficulty,
    pieceCount: pieces,
    inTheory: inTheory && phase === "opening",
  };
}

export function isEndgameContext(game: ChessGame): boolean {
  return getPositionContext(game).phase === "endgame";
}

export function endgameLabel(game: ChessGame): {
  name: string;
  idea: string;
  difficulty: string;
} {
  const pieces = countPieces(game);
  // Heuristic labels
  let hasRook = false;
  let hasQueen = false;
  let pawns = 0;
  for (const f of "abcdefgh") {
    for (let r = 1; r <= 8; r++) {
      const p = game.pieceAt(`${f}${r}`);
      if (!p) continue;
      if (p.role === "rook") hasRook = true;
      if (p.role === "queen") hasQueen = true;
      if (p.role === "pawn") pawns++;
    }
  }
  if (hasRook && !hasQueen && pawns <= 3) {
    return {
      name: "Rook endgame",
      idea: "Activate the king, cut off the enemy king, push passed pawns.",
      difficulty: "Advanced",
    };
  }
  if (!hasRook && !hasQueen && pawns >= 1) {
    return {
      name: "King and pawn",
      idea: "Opposition and key squares decide the game.",
      difficulty: "Intermediate",
    };
  }
  if (hasQueen && pieces <= 8) {
    return {
      name: "Queen endgame",
      idea: "Centralize the queen and watch perpetual checks.",
      difficulty: "Advanced",
    };
  }
  return {
    name: "Simplified endgame",
    idea: "Activate the king and create a passed pawn.",
    difficulty: "Intermediate",
  };
}
