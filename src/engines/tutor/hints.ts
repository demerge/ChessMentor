import type { ChessGame } from "@/engines/rules/game";
import type { EngineLine } from "@/lib/types";
import type { HintLevel, ProgressiveHint } from "@/lib/tutorTypes";
import { detectPatterns } from "./patterns";
import { explainMove } from "./moveExplain";

/**
 * Progressive hints — never dump the answer first.
 */
export function buildHintLadder(
  game: ChessGame,
  lines: EngineLine[],
  level: HintLevel
): ProgressiveHint {
  const best = [...lines].sort((a, b) => b.scoreCp - a.scoreCp)[0];
  const bestUci = best?.moveUci;
  const bestSan = bestUci
    ? game.sanForUci(bestUci) ?? best.moveSan ?? bestUci
    : undefined;
  const patterns = detectPatterns(game).filter((p) => p.available);

  if (level <= 1) {
    const kingish = patterns.find((p) => p.id === "king_safety" || p.id === "back_rank" || p.id === "mate_threat");
    return {
      level: 1,
      text: kingish
        ? "Look near the kings — safety or back-rank themes matter here."
        : "Look near your king, then scan for hanging pieces.",
      squares: kingish?.squares,
    };
  }

  if (level === 2) {
    const hang = patterns.find((p) => p.id === "hanging_piece" || p.id === "overload");
    const pin = patterns.find((p) => p.id === "pin");
    return {
      level: 2,
      text: hang
        ? "One unit is overloaded or hanging — which piece has too many jobs?"
        : pin
          ? "A pin is in the position — which piece cannot safely move?"
          : "One piece is doing too much work, or one is left undefended.",
      squares: hang?.squares ?? pin?.squares,
    };
  }

  if (level === 3) {
    const fork = patterns.find((p) => p.id === "fork");
    const pin = patterns.find((p) => p.id === "pin");
    if (fork) {
      return {
        level: 3,
        text: "Can you create or exploit a fork (one piece hitting two targets)?",
        squares: fork.squares,
        arrows: fork.arrows?.map((a) => ({ from: a.from, to: a.to })),
      };
    }
    if (pin) {
      return {
        level: 3,
        text: "Can you exploit the pinned piece?",
        squares: pin.squares,
        arrows: pin.arrows?.map((a) => ({ from: a.from, to: a.to })),
      };
    }
    return {
      level: 3,
      text: bestSan
        ? `Think about the idea behind a move like improving toward ${bestSan[0] === "N" || bestSan[0] === "B" ? "a minor-piece strike" : "the key sector"}…`
        : "Name the tactic before naming the squares.",
    };
  }

  if (level === 4) {
    // Animation-level: arrows without full move
    if (bestUci && bestUci.length >= 4) {
      return {
        level: 4,
        text: "Watch the key squares light up — the idea travels along this path.",
        squares: [bestUci.slice(0, 2), bestUci.slice(2, 4)],
        arrows: [{ from: bestUci.slice(0, 2), to: bestUci.slice(2, 4) }],
      };
    }
    return { level: 4, text: "Visualize the forcing sequence one ply at a time." };
  }

  // Level 5 — full reveal
  if (bestUci && bestSan) {
    const ex = explainMove(game, bestUci);
    return {
      level: 5,
      text: `Engine line: ${bestSan}. ${ex.summary.replace(/^I /, "It would ")}`,
      squares: [bestUci.slice(0, 2), bestUci.slice(2, 4)],
      arrows: [{ from: bestUci.slice(0, 2), to: bestUci.slice(2, 4) }],
      revealUci: bestUci,
    };
  }

  return { level: 5, text: "No engine line available — reassess legal captures first." };
}
