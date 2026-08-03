import type { EngineLine, TutorDetail } from "@/lib/types";
import type { ChessGame } from "@/engines/rules/game";
import {
  describePrediction,
  describeUserMove,
  explainMove,
} from "./moveExplain";

/** What the AI predicted you would do, and its planned follow-up. */
export interface AiPrediction {
  /** UCI of expected user reply */
  predictedUci: string;
  predictedSan: string;
  /** Human text: "I predict you will…" */
  predictionText: string;
  /** If you had played the prediction, AI planned this next (UCI) */
  contingencyUci?: string;
  contingencySan?: string;
  /** Human text for that contingency */
  contingencyText?: string;
  /** Position FEN when prediction was made (user to move) */
  fenWhenPredicted: string;
}

/** Full transparent AI coach message for one AI ply. */
export interface AiTutorSpeech {
  /** Reaction to what you just did vs last prediction (empty on first move) */
  reactionText: string;
  /** Why I play this move (attack/defense) */
  planText: string;
  /** What I think you'll do next */
  predictionText: string;
  /** Combined display block */
  fullText: string;
  prediction: AiPrediction | null;
  /** Coach guidance for the human on their turn */
  coachTip: string;
}

export interface PendingPrediction extends AiPrediction {
  /** First-person plan we stated when predicting */
  statedPlan: string;
}

function bestLineForMove(lines: EngineLine[], uci: string): EngineLine | undefined {
  const exact = lines.find((l) => l.moveUci === uci);
  if (exact) return exact;
  return [...lines].sort((a, b) => b.scoreCp - a.scoreCp)[0];
}

function sanOf(game: ChessGame, uci?: string): string | undefined {
  if (!uci) return undefined;
  return game.sanForUci(uci) ?? game.legalMoves().find((m) => m.uci === uci)?.san;
}

/**
 * Build prediction from PV: [myMove, yourReply, myFollowUp, ...]
 */
export function predictionFromPv(
  gameBeforeAiMove: ChessGame,
  aiUci: string,
  line?: EngineLine
): AiPrediction | null {
  const afterAi = gameBeforeAiMove.clone();
  if (!afterAi.playUci(aiUci)) return null;

  let predictedUci = line?.pv?.[1];
  // If PV short, ask legal "best guess" = first multipv for opponent isn't available;
  // leave prediction empty rather than invent illegal moves.
  if (!predictedUci || !afterAi.isLegalUci(predictedUci)) {
    // Fall back: if only one forcing reply, use popular capture
    const replies = afterAi.legalMoves();
    const capture = replies.find((m) => m.captured);
    predictedUci = capture?.uci ?? replies[0]?.uci;
  }
  if (!predictedUci || !afterAi.isLegalUci(predictedUci)) return null;

  const predictedSan =
    afterAi.sanForUci(predictedUci) ??
    afterAi.legalMoves().find((m) => m.uci === predictedUci)?.san ??
    predictedUci;

  const predictionText = `I predict ${describePrediction(afterAi, predictedUci)}.`;

  let contingencyUci = line?.pv?.[2];
  let contingencySan: string | undefined;
  let contingencyText: string | undefined;

  if (contingencyUci) {
    const afterUser = afterAi.clone();
    if (afterUser.playUci(predictedUci) && afterUser.isLegalUci(contingencyUci)) {
      contingencySan = sanOf(afterUser, contingencyUci);
      const ex = explainMove(afterUser, contingencyUci);
      contingencyText = `If you do that, my follow-up plan is ${contingencySan ?? contingencyUci}: ${ex.summary}`;
    } else {
      contingencyUci = undefined;
    }
  }

  // If no PV follow-up, invent contingency text from explanation of predicted capture reply
  if (!contingencyText && predictedUci) {
    contingencyText = `If you play that, I will re-evaluate and answer with the strongest defensive or attacking reply available.`;
  }

  return {
    predictedUci,
    predictedSan,
    predictionText,
    contingencyUci,
    contingencySan,
    contingencyText,
    fenWhenPredicted: afterAi.fen,
  };
}

/**
 * Compare actual user move to the stored prediction and narrate the branch change.
 */
export function buildReaction(
  gameBeforeUserMove: ChessGame,
  actualUci: string,
  pending: PendingPrediction | null,
  detail: TutorDetail
): string {
  if (!pending) {
    return "";
  }

  const actualSan =
    gameBeforeUserMove.sanForUci(actualUci) ??
    gameBeforeUserMove.legalMoves().find((m) => m.uci === actualUci)?.san ??
    actualUci;

  const matched =
    actualUci === pending.predictedUci ||
    actualSan === pending.predictedSan;

  const actualDesc = describeUserMove(gameBeforeUserMove, actualUci);

  if (matched) {
    let t = `You played exactly as I predicted (${pending.predictedSan}). `;
    if (pending.contingencySan) {
      t += `I am continuing my plan — next I still want ideas around ${pending.contingencySan}.`;
    } else {
      t += `I will continue the plan I outlined.`;
    }
    return t;
  }

  // Branch: prediction failed
  let t = `I predicted ${pending.predictionText.replace(/^I predict /, "")} `;
  t += `But ${actualDesc} instead. `;

  if (pending.contingencySan) {
    t += `If you had played ${pending.predictedSan}, I would have answered with ${pending.contingencySan}`;
    if (detail === "detailed" && pending.contingencyText) {
      t += ` (${pending.contingencyText.replace(/^If you do that, my follow-up plan is [^:]+: /, "")})`;
    }
    t += `. `;
  }

  t += `Because you chose a different path, I am abandoning that follow-up and choosing a new move that fits what you actually did.`;
  return t;
}

/**
 * Full AI speech: reaction (optional) + plan for this move + new prediction.
 */
export function buildAiSpeech(options: {
  gameBeforeAiMove: ChessGame;
  aiUci: string;
  lines: EngineLine[];
  pending: PendingPrediction | null;
  /** User's last move UCI (for reaction); null if AI opens */
  lastUserUci: string | null;
  gameBeforeUserMove: ChessGame | null;
  detail: TutorDetail;
}): AiTutorSpeech {
  const {
    gameBeforeAiMove,
    aiUci,
    lines,
    pending,
    lastUserUci,
    gameBeforeUserMove,
    detail,
  } = options;

  const line = bestLineForMove(lines, aiUci);
  const explanation = explainMove(gameBeforeAiMove, aiUci);

  let reactionText = "";
  if (pending && lastUserUci && gameBeforeUserMove) {
    reactionText = buildReaction(
      gameBeforeUserMove,
      lastUserUci,
      pending,
      detail
    );
  }

  // Plan: first person attack/defense
  let planText = explanation.summary;
  if (detail === "detailed") {
    if (explanation.attackReasons.length) {
      planText += ` Attack idea: ${explanation.attackReasons.join("; ")}.`;
    }
    if (explanation.defenseReasons.length) {
      planText += ` Defensive idea: ${explanation.defenseReasons.join("; ")}.`;
    }
  }

  const prediction = predictionFromPv(gameBeforeAiMove, aiUci, line);
  const predictionText = prediction
    ? `${prediction.predictionText}${
        prediction.contingencyText && detail === "detailed"
          ? ` ${prediction.contingencyText}`
          : prediction.contingencySan
            ? ` If you do, I plan ${prediction.contingencySan} next.`
            : ""
      }`
    : "I am waiting to see how you answer before locking a long variation.";

  // Coaching tip for the human: how to think about this
  const coachTip = buildCoachTip(explanation, prediction);

  const blocks = [reactionText, planText, predictionText].filter(Boolean);
  const fullText = blocks.join("\n\n");

  return {
    reactionText,
    planText,
    predictionText,
    fullText,
    prediction,
    coachTip,
  };
}

function buildCoachTip(
  explanation: ReturnType<typeof explainMove>,
  prediction: AiPrediction | null
): string {
  const tips: string[] = [];
  if (explanation.attackReasons.some((r) => r.includes("capture") || r.includes("check"))) {
    tips.push(
      "When I create a direct threat, ask: can I ignore it, must I block, or should I counter-attack?"
    );
  }
  if (explanation.defenseReasons.length) {
    tips.push(
      "I just reinforced something. Look for whether my piece is now overloaded defending two jobs."
    );
  }
  if (prediction) {
    tips.push(
      `You do not have to play my prediction (${prediction.predictedSan}). Try to find a move that breaks my idea.`
    );
  }
  if (tips.length === 0) {
    tips.push(
      "Name one attacking goal and one defensive goal for your next move before you touch a piece."
    );
  }
  return tips[0];
}

/**
 * Coach note on the user's turn: transparent guidance + live prediction reminder.
 */
export function buildUserTurnCoach(options: {
  game: ChessGame;
  lines: EngineLine[];
  pending: PendingPrediction | null;
  detail: TutorDetail;
}): string {
  const { game, lines, pending, detail } = options;
  const parts: string[] = [];

  if (pending) {
    parts.push(
      `My working prediction is still: ${pending.predictionText.replace(/^I predict /, "you might ")}`
    );
    if (pending.contingencySan) {
      parts.push(
        `If you go along with that, I am ready to answer with ${pending.contingencySan}.`
      );
    }
    parts.push(
      "You can surprise me — if you choose something else, I will explain how my plan changes."
    );
  }

  const best = [...lines].sort((a, b) => b.scoreCp - a.scoreCp)[0];
  if (best) {
    const san = game.sanForUci(best.moveUci) ?? best.moveSan ?? best.moveUci;
    const ex = explainMove(game, best.moveUci);
    if (detail === "detailed") {
      parts.push(
        `A strong candidate for you is ${san}: ${ex.summary.replace(/^I play/, "It would")}`
      );
    } else {
      parts.push(
        `Think in attack and defense: a solid idea starts with ${san} — ask what it attacks and what it protects.`
      );
    }
  } else {
    parts.push(
      "Before moving: (1) what is my last threat? (2) what do you attack? (3) what do you leave undefended?"
    );
  }

  return parts.join(" ");
}

/**
 * Explain the user's move after they play — coach feedback, not AI monologue.
 */
export function buildUserMoveFeedback(options: {
  before: ChessGame;
  uci: string;
  pending: PendingPrediction | null;
  classification: string;
  bestMoveSan?: string;
  detail: TutorDetail;
}): string {
  const { before, uci, pending, classification, bestMoveSan, detail } = options;
  const ex = explainMove(before, uci);
  // Rephrase first person → second person
  const youSummary = ex.summary
    .replace(/^I play/, "You play")
    .replace(/my /g, "your ")
    .replace(/your your/g, "your");

  const parts: string[] = [youSummary];

  if (pending) {
    const matched = uci === pending.predictedUci;
    if (matched) {
      parts.push(`That matches what I predicted (${pending.predictedSan}).`);
    } else {
      parts.push(
        `I had predicted ${pending.predictedSan}, so my next move will branch away from ${pending.contingencySan ?? "my old follow-up"}.`
      );
    }
  }

  if (
    bestMoveSan &&
    bestMoveSan !== ex.san &&
    ["inaccuracy", "mistake", "blunder"].includes(classification)
  ) {
    parts.push(
      `A more precise try was ${bestMoveSan} — compare what that would attack/defend versus your choice.`
    );
  }

  if (detail === "detailed") {
    if (ex.attackReasons.length)
      parts.push(`Attacking goals: ${ex.attackReasons.join("; ")}.`);
    if (ex.defenseReasons.length)
      parts.push(`Defensive goals: ${ex.defenseReasons.join("; ")}.`);
  }

  return parts.join(" ");
}
