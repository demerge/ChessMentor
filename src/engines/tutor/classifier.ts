import type { Classification } from "@/lib/types";

/**
 * Centipawn-loss thresholds aligned with Lichess/Chess.com conventions.
 * evals are from the mover's perspective before the move (higher = better for mover).
 */
export function classifyMove(
  evalBefore: number,
  evalAfterForMover: number,
  options?: {
    isBest: boolean;
    sacrificesMaterial?: boolean;
    engineConfirmsWin?: boolean;
  }
): { classification: Classification; cpLoss: number } {
  const cpLoss = Math.max(0, evalBefore - evalAfterForMover);

  if (
    options?.isBest &&
    options.sacrificesMaterial &&
    options.engineConfirmsWin &&
    cpLoss <= 50
  ) {
    return { classification: "brilliant", cpLoss };
  }

  if (cpLoss <= 10 || options?.isBest) {
    return { classification: "best", cpLoss };
  }
  if (cpLoss <= 50) return { classification: "good", cpLoss };
  if (cpLoss <= 100) return { classification: "inaccuracy", cpLoss };
  if (cpLoss <= 300) return { classification: "mistake", cpLoss };
  return { classification: "blunder", cpLoss };
}

/** Lichess-style accuracy from average win% loss approximation. */
export function accuracyFromAnnotations(
  cpLosses: number[]
): number {
  if (cpLosses.length === 0) return 100;
  // Map each move's cp loss to a win% proxy, then average
  const scores = cpLosses.map((loss) => {
    // rough: 0 cp → 100, 100 cp → ~70, 300+ → low
    const winLoss = Math.min(100, loss / 2.5);
    return Math.max(0, 100 - winLoss);
  });
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(Math.min(100, Math.max(0, avg)) * 10) / 10;
}
