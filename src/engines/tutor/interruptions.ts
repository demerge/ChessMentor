import type { Classification } from "@/lib/types";
import type { InterruptLevel, InterruptPayload } from "@/lib/tutorTypes";
import { emotionalInterrupt } from "./emotional";

export function interruptLevel(
  classification: Classification,
  cpLoss: number,
  allowsMateIn?: number
): InterruptLevel {
  if (allowsMateIn !== undefined && allowsMateIn <= 3) return "forced_mate";
  if (classification === "blunder" || cpLoss >= 300) return "major";
  if (classification === "mistake" || cpLoss >= 100) return "minor";
  // Never interrupt tiny inaccuracies
  return "none";
}

export function buildInterrupt(opts: {
  classification: Classification;
  cpLoss: number;
  san: string;
  bestMoveSan?: string;
  bestMoveUci?: string;
  allowsMateIn?: number;
}): InterruptPayload | null {
  const level = interruptLevel(
    opts.classification,
    opts.cpLoss,
    opts.allowsMateIn
  );
  if (level === "none") return null;

  const emotional = emotionalInterrupt(level, opts.san, opts.bestMoveSan);

  if (level === "forced_mate") {
    return {
      level,
      title: "Mate alert",
      message: `You're about to allow checkmate in ${opts.allowsMateIn ?? 2}.`,
      emotional,
      cpLoss: opts.cpLoss,
      bestMoveSan: opts.bestMoveSan,
      bestMoveUci: opts.bestMoveUci,
      allowsMateIn: opts.allowsMateIn,
    };
  }

  if (level === "major") {
    return {
      level,
      title: "Major moment",
      message:
        opts.cpLoss >= 500
          ? "This hangs serious material (queen-level damage or worse)."
          : "This loses a large amount of material or the game.",
      emotional,
      cpLoss: opts.cpLoss,
      bestMoveSan: opts.bestMoveSan,
      bestMoveUci: opts.bestMoveUci,
    };
  }

  // minor
  return {
    level,
    title: "Learning pause",
    message:
      opts.cpLoss >= 200
        ? "This loses roughly a piece's worth of value."
        : "This loses about a pawn (or clear positional damage).",
    emotional,
    cpLoss: opts.cpLoss,
    bestMoveSan: opts.bestMoveSan,
    bestMoveUci: opts.bestMoveUci,
  };
}
