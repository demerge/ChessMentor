import type { AiTier, EngineLine } from "@/lib/types";
import { TIER_META } from "@/lib/types";

export interface DifficultyConfig {
  tier: AiTier;
  elo: number;
  skill: number;
  limitStrength: boolean;
  /** Movetime in ms for engine search */
  moveTimeMs: number;
  /** MultiPV for tutor / blunder shaping */
  multiPv: number;
  depthCap?: number;
}

export function difficultyConfig(tier: AiTier): DifficultyConfig {
  const meta = TIER_META[tier];
  const moveTimeMs: Record<AiTier, number> = {
    beginner: 200,
    beginnerPlus: 300,
    club: 500,
    expert: 800,
    master: 1200,
    elite: 2000,
  };
  const multiPv: Record<AiTier, number> = {
    beginner: 5,
    beginnerPlus: 4,
    club: 3,
    expert: 2,
    master: 2,
    elite: 1,
  };
  return {
    tier,
    elo: meta.elo,
    skill: meta.skill,
    limitStrength: meta.limitStrength,
    moveTimeMs: moveTimeMs[tier],
    multiPv: multiPv[tier],
    depthCap: tier === "elite" ? 18 : tier === "master" ? 14 : undefined,
  };
}

/**
 * Blunder-shaping: sample from top-N multipv lines so weak tiers play
 * humanly flawed moves instead of pure random legal moves.
 */
export function shapeMove(
  tier: AiTier,
  lines: EngineLine[],
  legalUcis: string[]
): EngineLine | null {
  if (lines.length === 0) {
    if (legalUcis.length === 0) return null;
    const uci = legalUcis[Math.floor(Math.random() * legalUcis.length)];
    return { moveUci: uci, scoreCp: 0, depth: 0, pv: [uci] };
  }

  const sorted = [...lines].sort((a, b) => b.scoreCp - a.scoreCp);
  const best = sorted[0];

  if (tier === "elite" || tier === "master") {
    return best;
  }

  // Weights favor best line but leave room for lesser moves at low tiers
  const weightsByTier: Record<AiTier, number[]> = {
    beginner: [0.35, 0.25, 0.2, 0.12, 0.08],
    beginnerPlus: [0.5, 0.25, 0.15, 0.1],
    club: [0.7, 0.2, 0.1],
    expert: [0.88, 0.12],
    master: [1],
    elite: [1],
  };

  const weights = weightsByTier[tier];
  const pool = sorted.slice(0, weights.length);

  // Occasional intentional blunder for beginners: pick a clearly worse line
  if (
    (tier === "beginner" || tier === "beginnerPlus") &&
    sorted.length > 1 &&
    Math.random() < (tier === "beginner" ? 0.18 : 0.1)
  ) {
    // Prefer a line that loses ~100–400 cp vs best if available
    const blunderish = sorted.filter(
      (l) => best.scoreCp - l.scoreCp >= 80 && best.scoreCp - l.scoreCp <= 500
    );
    if (blunderish.length) {
      return blunderish[Math.floor(Math.random() * blunderish.length)];
    }
    return sorted[sorted.length - 1];
  }

  const r = Math.random();
  let acc = 0;
  for (let i = 0; i < pool.length; i++) {
    acc += weights[i] ?? 0;
    if (r <= acc) return pool[i];
  }
  return pool[0];
}

/** Search budget for analysis (classification), independent of AI strength. */
export function analysisBudget(): { moveTimeMs: number; multiPv: number } {
  return { moveTimeMs: 400, multiPv: 3 };
}
