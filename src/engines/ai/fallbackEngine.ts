import type { AiTier, EngineLine } from "@/lib/types";
import { ChessGame } from "@/engines/rules/game";
import { difficultyConfig, shapeMove } from "./difficulty";

const PIECE_VALUE: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Simplified piece-square tables (white perspective, a1=0)
const PST: Record<string, number[]> = {
  p: [
    0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30,
    20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10,
    0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0,
  ],
  n: [
    -50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30,
    0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20,
    15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  b: [
    -20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0,
    5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10,
    0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20,
    -10, -10, -10, -10, -10, -10, -20,
  ],
  r: [
    0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0,
    -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0,
    -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0,
  ],
  q: [
    -20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5,
    5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5,
    5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10,
    -10, -20,
  ],
  k: [
    -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40,
    -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40,
    -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20,
    -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20,
  ],
};

function mirror(i: number): number {
  const file = i % 8;
  const rank = Math.floor(i / 8);
  return (7 - rank) * 8 + file;
}

function evaluate(game: ChessGame): number {
  // Side-to-move relative score in centipawns
  let score = 0;
  const files = "abcdefgh";
  for (let rank = 1; rank <= 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const sq = `${files[file]}${rank}`;
      const piece = game.pieceAt(sq);
      if (!piece) continue;
      const idx = (rank - 1) * 8 + file;
      const role = piece.role[0]; // p,n,b,r,q,k
      const base = PIECE_VALUE[role] ?? 0;
      const table = PST[role] ?? PST.p;
      const pst =
        piece.color === "white" ? table[mirror(idx)] : table[idx];
      const v = base + pst;
      score += piece.color === "white" ? v : -v;
    }
  }

  // KOTH bonus: king proximity to center
  if (game.variant === "koth") {
    const centers = ["d4", "d5", "e4", "e5"];
    for (const c of centers) {
      const p = game.pieceAt(c);
      if (p?.role === "king") {
        score += p.color === "white" ? 5000 : -5000;
      }
    }
  }

  // Atomic: king presence is everything; reduce queen value slightly (explosions)
  if (game.variant === "atomic") {
    score = Math.round(score * 0.9);
  }

  return game.turn === "white" ? score : -score;
}

function orderMoves(game: ChessGame) {
  return game.legalMoves().sort((a, b) => {
    const cap = (b.captured ? 10 : 0) - (a.captured ? 10 : 0);
    return cap;
  });
}

function minimax(
  game: ChessGame,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean
): number {
  const snap = game.snapshot();
  if (snap.isGameOver) {
    if (snap.result === "1/2-1/2") return 0;
    // Mate for side that just moved — evaluate from current turn perspective
    if (snap.result === "1-0") return game.turn === "white" ? -100000 : 100000;
    if (snap.result === "0-1") return game.turn === "white" ? 100000 : -100000;
  }
  if (depth === 0) return evaluate(game);

  const moves = orderMoves(game);
  if (moves.length === 0) return evaluate(game);

  if (maximizing) {
    let maxEval = -Infinity;
    for (const m of moves) {
      const child = game.clone();
      child.playUci(m.uci);
      const ev = minimax(child, depth - 1, alpha, beta, false);
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return maxEval;
  }

  let minEval = Infinity;
  for (const m of moves) {
    const child = game.clone();
    child.playUci(m.uci);
    const ev = minimax(child, depth - 1, alpha, beta, true);
    minEval = Math.min(minEval, ev);
    beta = Math.min(beta, ev);
    if (beta <= alpha) break;
  }
  return minEval;
}

function depthForTier(tier: AiTier): number {
  const map: Record<AiTier, number> = {
    beginner: 1,
    beginnerPlus: 2,
    club: 2,
    expert: 3,
    master: 3,
    elite: 4,
  };
  return map[tier];
}

/** Pure JS search — primary AI for Atomic, fallback for other variants. */
export function fallbackAnalyze(
  game: ChessGame,
  multiPv = 3,
  depth = 2
): EngineLine[] {
  const moves = orderMoves(game);
  const lines: EngineLine[] = [];

  for (const m of moves) {
    const child = game.clone();
    child.playUci(m.uci);
    const score = -minimax(child, Math.max(0, depth - 1), -Infinity, Infinity, true);
    lines.push({
      moveUci: m.uci,
      moveSan: m.san,
      scoreCp: score,
      depth,
      pv: [m.uci],
    });
  }

  lines.sort((a, b) => b.scoreCp - a.scoreCp);
  return lines.slice(0, multiPv);
}

export function fallbackBestMove(
  game: ChessGame,
  tier: AiTier
): EngineLine {
  const cfg = difficultyConfig(tier);
  const depth = depthForTier(tier);
  const lines = fallbackAnalyze(game, cfg.multiPv, depth);
  const legal = game.legalMoves().map((m) => m.uci);
  const shaped = shapeMove(tier, lines, legal);
  if (shaped) return shaped;
  // Absolute last resort — any legal move
  if (legal.length > 0) {
    const uci = legal[Math.floor(Math.random() * legal.length)];
    return { moveUci: uci, scoreCp: 0, depth: 0, pv: [uci] };
  }
  throw new Error("No legal moves");
}
