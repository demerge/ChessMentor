import type { PositionFeatures } from "@/lib/types";
import { ChessGame } from "@/engines/rules/game";

const CENTER = ["d4", "d5", "e4", "e5"];
const EXTENDED_CENTER = [
  "c3",
  "c4",
  "c5",
  "c6",
  "d3",
  "d4",
  "d5",
  "d6",
  "e3",
  "e4",
  "e5",
  "e6",
  "f3",
  "f4",
  "f5",
  "f6",
];

function allSquares(): string[] {
  const out: string[] = [];
  for (let r = 1; r <= 8; r++) {
    for (const f of "abcdefgh") out.push(`${f}${r}`);
  }
  return out;
}

function findKing(game: ChessGame, color: "white" | "black"): string | null {
  for (const sq of allSquares()) {
    const p = game.pieceAt(sq);
    if (p?.role === "king" && p.color === color) return sq;
  }
  return null;
}

function kingSafety(game: ChessGame, color: "white" | "black"): number {
  const king = findKing(game, color);
  if (!king) return 0;
  const file = king.charCodeAt(0) - 97;
  const rank = Number(king[1]);
  const pawnDir = color === "white" ? 1 : -1;
  let shield = 0;
  for (const df of [-1, 0, 1]) {
    const f = file + df;
    if (f < 0 || f > 7) continue;
    const sq = `${String.fromCharCode(97 + f)}${rank + pawnDir}`;
    const p = game.pieceAt(sq);
    if (p?.role === "pawn" && p.color === color) shield += 1;
  }
  // castled-ish: king on g/c file
  const castled = file === 6 || file === 2 ? 1 : 0;
  // open file near king is bad
  let openFiles = 0;
  for (const df of [-1, 0, 1]) {
    const f = file + df;
    if (f < 0 || f > 7) continue;
    let hasPawn = false;
    for (let r = 1; r <= 8; r++) {
      const p = game.pieceAt(`${String.fromCharCode(97 + f)}${r}`);
      if (p?.role === "pawn" && p.color === color) hasPawn = true;
    }
    if (!hasPawn) openFiles++;
  }
  return shield * 2 + castled * 2 - openFiles;
}

function mobility(game: ChessGame, color: "white" | "black"): number {
  if (game.turn !== color) {
    // approximate: count pieces * rough mobility is expensive without dests for other side
    // clone and flip isn't free; count legal moves if it's their turn only
    return 0;
  }
  return game.legalMoves().length;
}

function pawnFiles(game: ChessGame, color: "white" | "black"): number[] {
  const files: number[] = [];
  for (const sq of allSquares()) {
    const p = game.pieceAt(sq);
    if (p?.role === "pawn" && p.color === color) {
      files.push(sq.charCodeAt(0) - 97);
    }
  }
  return files;
}

function structureFlags(game: ChessGame): {
  isolated: number;
  doubled: number;
  passed: number;
} {
  let isolated = 0;
  let doubled = 0;
  let passed = 0;

  for (const color of ["white", "black"] as const) {
    const files = pawnFiles(game, color);
    const counts = Array(8).fill(0);
    files.forEach((f) => counts[f]++);
    for (let f = 0; f < 8; f++) {
      if (counts[f] > 1) doubled += counts[f] - 1;
      if (counts[f] > 0) {
        const neighbors = (counts[f - 1] || 0) + (counts[f + 1] || 0);
        if (neighbors === 0) isolated += counts[f];
      }
    }
    // rough passed pawn: no opposing pawns on same/adj files ahead
    for (const sq of allSquares()) {
      const p = game.pieceAt(sq);
      if (p?.role !== "pawn" || p.color !== color) continue;
      const file = sq.charCodeAt(0) - 97;
      const rank = Number(sq[1]);
      let blocked = false;
      for (const osq of allSquares()) {
        const op = game.pieceAt(osq);
        if (op?.role !== "pawn" || op.color === color) continue;
        const of = osq.charCodeAt(0) - 97;
        const or = Number(osq[1]);
        if (Math.abs(of - file) <= 1) {
          if (color === "white" && or > rank) blocked = true;
          if (color === "black" && or < rank) blocked = true;
        }
      }
      if (!blocked) passed++;
    }
  }
  return { isolated, doubled, passed };
}

function hangingPieces(game: ChessGame): string[] {
  // Heuristic: unprotected non-pawn pieces that could be captured
  // Full attack map is heavy; flag obvious hanging from last-move context is better.
  // Here: pieces of side-to-move's opponent that are on squares attacked and undefended — skip heavy calc.
  // Simple: list opponent pieces with value if legal capture exists on them this turn
  const hanging: string[] = [];
  const moves = game.legalMoves().filter((m) => m.captured && m.captured !== "pawn");
  for (const m of moves) {
    hanging.push(`${m.captured} on ${m.to}`);
  }
  return [...new Set(hanging)].slice(0, 4);
}

export function extractFeatures(game: ChessGame): PositionFeatures {
  const mat = game.material();
  let center = 0;
  for (const sq of CENTER) {
    const p = game.pieceAt(sq);
    if (p) center += p.color === "white" ? 1 : -1;
  }
  for (const sq of EXTENDED_CENTER) {
    const p = game.pieceAt(sq);
    if (p && p.role !== "pawn") center += p.color === "white" ? 0.3 : -0.3;
  }

  const structure = structureFlags(game);
  const turn = game.turn;

  return {
    materialWhite: mat.white,
    materialBlack: mat.black,
    materialBalance: mat.white - mat.black,
    centerControl: Math.round(center * 10) / 10,
    whiteKingSafety: kingSafety(game, "white"),
    blackKingSafety: kingSafety(game, "black"),
    whiteMobility: turn === "white" ? mobility(game, "white") : 0,
    blackMobility: turn === "black" ? mobility(game, "black") : 0,
    isolatedPawns: structure.isolated,
    doubledPawns: structure.doubled,
    passedPawns: structure.passed,
    hangingPieces: hangingPieces(game),
    sideToMove: turn,
  };
}

export function materialDelta(
  before: ChessGame,
  after: ChessGame,
  mover: "white" | "black"
): number {
  const b = before.material();
  const a = after.material();
  const balBefore = b.white - b.black;
  const balAfter = a.white - a.black;
  // positive = mover gained material
  return mover === "white" ? balAfter - balBefore : balBefore - balAfter;
}
