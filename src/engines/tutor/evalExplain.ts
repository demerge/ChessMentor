import type { ChessGame } from "@/engines/rules/game";
import type { EvalExplanation, EvalFactor } from "@/lib/tutorTypes";
import { extractFeatures } from "./featureExtractor";
import { materialDelta } from "./featureExtractor";

/**
 * Explain *why* the evaluation changed — factors, not just a number.
 */
export function explainEvalChange(
  before: ChessGame,
  after: ChessGame,
  evalBefore: number,
  evalAfterForMover: number
): EvalExplanation {
  const mover = before.turn;
  const f0 = extractFeatures(before);
  const f1 = extractFeatures(after);
  const mat = materialDelta(before, after, mover);
  const factors: EvalFactor[] = [];

  if (mat > 0) {
    factors.push({
      label: `Won material (~${mat} pawn unit${mat > 1 ? "s" : ""})`,
      delta: mat * 100,
      sign: "+",
    });
  } else if (mat < 0) {
    factors.push({
      label: `Lost material (~${Math.abs(mat)} pawn unit${Math.abs(mat) > 1 ? "s" : ""})`,
      delta: mat * 100,
      sign: "−",
    });
  }

  const centerDelta =
    mover === "white"
      ? f1.centerControl - f0.centerControl
      : f0.centerControl - f1.centerControl;
  if (Math.abs(centerDelta) >= 0.5) {
    factors.push({
      label:
        centerDelta > 0
          ? "Improved central control"
          : "Surrendered central space",
      delta: centerDelta * 40,
      sign: centerDelta > 0 ? "+" : "−",
    });
  }

  const king0 = mover === "white" ? f0.whiteKingSafety : f0.blackKingSafety;
  const king1 = mover === "white" ? f1.whiteKingSafety : f1.blackKingSafety;
  if (king1 > king0) {
    factors.push({ label: "Safer king", delta: 30, sign: "+" });
  } else if (king1 < king0) {
    factors.push({ label: "Weaker king safety", delta: -40, sign: "−" });
  }

  if (f1.passedPawns > f0.passedPawns) {
    factors.push({ label: "Created/advanced a passed pawn", delta: 50, sign: "+" });
  }

  // Bishop pair rough
  const bishops = (g: ChessGame, c: "white" | "black") => {
    let n = 0;
    for (const f of "abcdefgh") {
      for (let r = 1; r <= 8; r++) {
        const p = g.pieceAt(`${f}${r}`);
        if (p?.role === "bishop" && p.color === c) n++;
      }
    }
    return n;
  };
  if (bishops(after, mover) === 2 && bishops(before, mover) < 2) {
    factors.push({ label: "Won the bishop pair", delta: 40, sign: "+" });
  }
  if (bishops(after, mover) < 2 && bishops(before, mover) === 2) {
    factors.push({ label: "Lost the bishop pair", delta: -40, sign: "−" });
  }

  if (after.isCheck) {
    factors.push({ label: "Gave check / gained tempo", delta: 25, sign: "+" });
  }

  const mobility0 =
    mover === "white" ? f0.whiteMobility : f0.blackMobility;
  // after turn flips
  const mobilityProxy = after.legalMoves().length;
  if (mobility0 > 0 && mobilityProxy < 8 && mover !== after.turn) {
    // opponent has few moves - restriction
    if (mobilityProxy <= 5) {
      factors.push({ label: "Restricted opponent activity", delta: 20, sign: "+" });
    }
  }

  // Open file: rook moved to file without pawns
  const last = after.historyUci[after.historyUci.length - 1];
  if (last) {
    const to = last.slice(2, 4);
    const piece = after.pieceAt(to);
    if (piece?.role === "rook" || piece?.role === "queen") {
      const file = to[0];
      let pawns = 0;
      for (let r = 1; r <= 8; r++) {
        if (after.pieceAt(`${file}${r}`)?.role === "pawn") pawns++;
      }
      if (pawns === 0) {
        factors.push({ label: "Opened / seized an open file", delta: 25, sign: "+" });
      }
    }
  }

  if (factors.length === 0) {
    const cp = evalAfterForMover - evalBefore;
    if (cp > 30) {
      factors.push({ label: "Improved piece coordination", delta: cp, sign: "+" });
    } else if (cp < -30) {
      factors.push({ label: "Worsened coordination / structure", delta: cp, sign: "−" });
    } else {
      factors.push({ label: "Position remains roughly balanced", delta: 0, sign: "+" });
    }
  }

  const forMover = evalAfterForMover - evalBefore;
  const summary =
    forMover > 50
      ? "Evaluation increased because of the factors below."
      : forMover < -50
        ? "Evaluation dropped because of the factors below."
        : "Evaluation stayed similar; small positional shifts only.";

  return {
    before: evalBefore,
    after: evalAfterForMover,
    forMover,
    factors: factors.slice(0, 6),
    summary,
  };
}

export function formatEvalCp(cp: number): string {
  if (Math.abs(cp) >= 90000) return cp > 0 ? "M" : "-M";
  const v = (cp / 100).toFixed(1);
  return cp > 0 ? `+${v}` : v;
}
