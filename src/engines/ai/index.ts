import type { AiTier, EngineLine } from "@/lib/types";
import { ChessGame } from "@/engines/rules/game";
import { getStockfish } from "./stockfishClient";
import { fallbackAnalyze, fallbackBestMove } from "./fallbackEngine";
import { difficultyConfig, shapeMove } from "./difficulty";

const STOCKFISH_BUDGET_MS = 6000;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timeout`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

export async function ensureEngineReady(
  variant: ChessGame["variant"]
): Promise<boolean> {
  if (variant === "atomic") return false;
  try {
    await withTimeout(getStockfish().init(), 12000, "engine init");
    return true;
  } catch {
    return false;
  }
}

/**
 * Single multipv search used for both tutor intent and AI move selection.
 * Avoids a second Stockfish call that was hanging after intent analysis.
 */
export async function analyzeForTurn(
  game: ChessGame,
  tier: AiTier
): Promise<EngineLine[]> {
  const cfg = difficultyConfig(tier);

  if (game.variant === "atomic") {
    return fallbackAnalyze(game, cfg.multiPv, depthForTier(tier));
  }

  try {
    const sf = getStockfish();
    await withTimeout(sf.init(), 12000, "engine init");
    const lines = await withTimeout(
      sf.analyze(game.fen, {
        chess960: game.variant === "chess960",
        multiPv: Math.max(cfg.multiPv, 3),
        moveTimeMs: Math.max(cfg.moveTimeMs, 250),
      }),
      STOCKFISH_BUDGET_MS,
      "analyze"
    );
    if (lines.length === 0) throw new Error("empty multipv");
    return lines;
  } catch {
    return fallbackAnalyze(game, cfg.multiPv, depthForTier(tier));
  }
}

export async function getAiMove(
  game: ChessGame,
  tier: AiTier,
  precomputed?: EngineLine[]
): Promise<EngineLine> {
  const legal = game.legalMoves().map((m) => m.uci);

  if (precomputed && precomputed.length > 0) {
    const shaped = shapeMove(tier, precomputed, legal);
    if (shaped) return shaped;
  }

  if (game.variant === "atomic") {
    return fallbackBestMove(game, tier);
  }

  try {
    const sf = getStockfish();
    await withTimeout(sf.init(), 12000, "engine init");
    return await withTimeout(
      sf.getBestMove(game.fen, tier, {
        chess960: game.variant === "chess960",
        legalUcis: legal,
      }),
      STOCKFISH_BUDGET_MS,
      "bestmove"
    );
  } catch {
    return fallbackBestMove(game, tier);
  }
}

export async function analyzePosition(
  game: ChessGame,
  multiPv = 3
): Promise<EngineLine[]> {
  if (game.variant === "atomic") {
    return fallbackAnalyze(game, multiPv, 2);
  }
  try {
    const sf = getStockfish();
    await withTimeout(sf.init(), 12000, "engine init");
    const lines = await withTimeout(
      sf.analyze(game.fen, {
        chess960: game.variant === "chess960",
        multiPv,
      }),
      STOCKFISH_BUDGET_MS,
      "analyze"
    );
    if (lines.length === 0) throw new Error("empty");
    return lines;
  } catch {
    return fallbackAnalyze(game, multiPv, 2);
  }
}

export async function evaluateFen(game: ChessGame): Promise<number> {
  const lines = await analyzePosition(game, 1);
  return lines[0]?.scoreCp ?? 0;
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
