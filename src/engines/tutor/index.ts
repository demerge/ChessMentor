import type {
  Classification,
  EngineLine,
  MoveAnnotation,
  StoredPrediction,
  TutorDetail,
} from "@/lib/types";
import { ChessGame } from "@/engines/rules/game";
import { analyzePosition, evaluateFen } from "@/engines/ai";
import { classifyMove } from "./classifier";
import { materialDelta } from "./featureExtractor";
import {
  buildAiSpeech,
  buildUserMoveFeedback,
  buildUserTurnCoach,
  type PendingPrediction,
} from "./dialogue";

export type { PendingPrediction };
export { detectThemes } from "./templates";
export { accuracyFromAnnotations } from "./classifier";

function toPending(
  stored: StoredPrediction | null
): PendingPrediction | null {
  return stored ? { ...stored } : null;
}

export function buildIntentNoteFromLines(
  game: ChessGame,
  detail: TutorDetail,
  isAi: boolean,
  lines: EngineLine[] = [],
  pending: StoredPrediction | null = null
): string {
  if (isAi) {
    return "I am choosing my move and will explain the attack, the defense, and what I expect from you…";
  }
  return buildUserTurnCoach({
    game,
    lines,
    pending: toPending(pending),
    detail,
  });
}

export interface AnnotateContext {
  isAi: boolean;
  pending: StoredPrediction | null;
  gameBeforeUserMove?: ChessGame | null;
  lastUserUci?: string | null;
}

export async function annotateMove(
  gameBefore: ChessGame,
  uci: string,
  detail: TutorDetail,
  intentNote: string,
  precomputedLines?: EngineLine[],
  ctx: AnnotateContext = { isAi: false, pending: null }
): Promise<{
  annotation: MoveAnnotation;
  nextPrediction: StoredPrediction | null;
}> {
  const fenBefore = gameBefore.fen;
  const san =
    gameBefore.sanForUci(uci) ??
    gameBefore.legalMoves().find((m) => m.uci === uci)?.san ??
    uci;
  const mover = gameBefore.turn;

  let evalBefore = 0;
  let bestMoveUci: string | undefined;
  let bestMoveSan: string | undefined;
  let lines: EngineLine[] = precomputedLines ?? [];

  try {
    if (!lines.length) lines = await analyzePosition(gameBefore, 3);
    if (lines[0]) {
      const sorted = [...lines].sort((a, b) => b.scoreCp - a.scoreCp);
      evalBefore = sorted[0].scoreCp;
      bestMoveUci = sorted[0].moveUci;
      bestMoveSan =
        gameBefore.sanForUci(sorted[0].moveUci) ?? sorted[0].moveSan;
    }
  } catch {
    /* engine optional */
  }

  const gameAfter = gameBefore.clone();
  if (!gameAfter.playUci(uci)) throw new Error(`Illegal move ${uci}`);

  let evalAfterForMover = 0;
  const fromLines = lines.find((l) => l.moveUci === uci);
  if (fromLines) {
    evalAfterForMover = fromLines.scoreCp;
  } else {
    try {
      evalAfterForMover = -(await evaluateFen(gameAfter));
    } catch {
      evalAfterForMover = 0;
    }
  }

  const isBest =
    bestMoveUci === uci ||
    (bestMoveSan !== undefined && bestMoveSan === san);
  const matGain = materialDelta(gameBefore, gameAfter, mover);
  const { classification, cpLoss } = classifyMove(
    evalBefore,
    evalAfterForMover,
    {
      isBest,
      sacrificesMaterial: matGain < 0,
      engineConfirmsWin: evalAfterForMover > 150,
    }
  );

  let reactionText = "";
  let planText = "";
  let predictionText = "";
  let coachTip = "";
  let outcomeNote = "";
  let nextPrediction: StoredPrediction | null = null;
  let intentOut = intentNote;

  if (ctx.isAi) {
    const speech = buildAiSpeech({
      gameBeforeAiMove: gameBefore,
      aiUci: uci,
      lines,
      pending: toPending(ctx.pending),
      lastUserUci: ctx.lastUserUci ?? null,
      gameBeforeUserMove: ctx.gameBeforeUserMove ?? null,
      detail,
    });
    reactionText = speech.reactionText;
    planText = speech.planText;
    predictionText = speech.predictionText;
    coachTip = speech.coachTip;
    outcomeNote = speech.fullText;
    intentOut = speech.planText;
    if (speech.prediction) {
      nextPrediction = {
        ...speech.prediction,
        statedPlan: speech.planText,
      };
    }
  } else {
    outcomeNote = buildUserMoveFeedback({
      before: gameBefore,
      uci,
      pending: toPending(ctx.pending),
      classification,
      bestMoveSan: isBest ? undefined : bestMoveSan,
      detail,
    });
    planText = outcomeNote;
  }

  return {
    annotation: {
      ply: gameAfter.historyUci.length,
      san,
      uci,
      fenBefore,
      fenAfter: gameAfter.fen,
      intentNote: intentOut,
      outcomeNote,
      classification: classification as Classification,
      evalBefore,
      evalAfter: evalAfterForMover,
      bestMoveSan: isBest ? undefined : bestMoveSan,
      bestMoveUci: isBest ? undefined : bestMoveUci,
      cpLoss,
      reactionText: reactionText || undefined,
      planText: planText || undefined,
      predictionText: predictionText || undefined,
      coachTip: coachTip || undefined,
      byAi: ctx.isAi,
    },
    nextPrediction,
  };
}
