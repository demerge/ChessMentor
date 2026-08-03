import type { Classification } from "@/lib/types";
import type { CoachExplainMode, EvalExplanation } from "@/lib/tutorTypes";
import type { ChessGame } from "@/engines/rules/game";
import { explainMove } from "./moveExplain";
import { emotionalOutcome } from "./emotional";

export function coachExplain(opts: {
  mode: CoachExplainMode;
  before: ChessGame;
  uci: string;
  san: string;
  classification: Classification;
  evalExplanation?: EvalExplanation;
  bestMoveSan?: string;
  byAi: boolean;
}): { text: string; arrows: { from: string; to: string; color: string }[] } {
  const ex = explainMove(opts.before, opts.uci);
  const arrows = [
    {
      from: opts.uci.slice(0, 2),
      to: opts.uci.slice(2, 4),
      color: opts.byAi ? "#3C6E47" : "#1A1A1A",
    },
  ];

  if (opts.mode === "show_arrows") {
    return {
      text: `Arrows show ${opts.san}. ${ex.summary}`,
      arrows,
    };
  }

  if (opts.mode === "like_10") {
    const kid = opts.byAi
      ? `I moved my ${ex.piece} to ${ex.to}. `
      : `You moved your ${ex.piece} to ${ex.to}. `;
    let why = "";
    if (ex.attackReasons[0]) why += `That tries to ${ex.attackReasons[0]}. `;
    if (ex.defenseReasons[0]) why += `It also helps to ${ex.defenseReasons[0]}. `;
    if (!why) why = "It puts the piece on a better square. ";
    if (opts.classification === "blunder" || opts.classification === "mistake") {
      why += opts.bestMoveSan
        ? `A safer idea was ${opts.bestMoveSan}.`
        : `There was a safer idea nearby.`;
    } else if (opts.classification === "best" || opts.classification === "good") {
      why += "That was a smart idea!";
    }
    return { text: kid + why, arrows };
  }

  // why_good / general
  const emo = emotionalOutcome(
    opts.classification,
    opts.san,
    opts.bestMoveSan
  );
  let text = `${emo}\n\n${ex.summary}`;
  if (opts.evalExplanation) {
    text += `\n\n${opts.evalExplanation.summary}`;
    for (const f of opts.evalExplanation.factors) {
      text += `\n${f.sign} ${f.label}`;
    }
  }
  return { text, arrows };
}
