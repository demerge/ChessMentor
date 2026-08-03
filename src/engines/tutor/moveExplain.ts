import type { ChessGame, LegalMove } from "@/engines/rules/game";
import { allSquares, attacksSquare } from "@/engines/rules/attacks";

const ROLE_NAME: Record<string, string> = {
  pawn: "pawn",
  knight: "knight",
  bishop: "bishop",
  rook: "rook",
  queen: "queen",
  king: "king",
};

const CENTER = new Set(["d4", "d5", "e4", "e5", "c4", "c5", "f4", "f5"]);

function pieceName(role: string): string {
  return ROLE_NAME[role] ?? role;
}

function capturableBySideToMove(game: ChessGame): Map<string, LegalMove[]> {
  const map = new Map<string, LegalMove[]>();
  for (const m of game.legalMoves()) {
    if (!m.captured) continue;
    const list = map.get(m.to) ?? [];
    list.push(m);
    map.set(m.to, list);
  }
  return map;
}

function joinReasons(rs: string[]): string {
  if (rs.length === 1) return rs[0];
  if (rs.length === 2) return `${rs[0]} and ${rs[1]}`;
  return `${rs.slice(0, -1).join(", ")}, and ${rs[rs.length - 1]}`;
}

function uniq(xs: string[], n = 3): string[] {
  return [...new Set(xs)].slice(0, n);
}

function wasLikelyHanging(
  game: ChessGame,
  square: string,
  ourColor: "white" | "black"
): boolean {
  for (const sq of allSquares()) {
    const p = game.pieceAt(sq);
    if (!p || p.color === ourColor) continue;
    if (attacksSquare(game, sq, square, p.role)) return true;
  }
  return false;
}

export interface MoveExplanation {
  san: string;
  uci: string;
  from: string;
  to: string;
  piece: string;
  attackReasons: string[];
  defenseReasons: string[];
  otherReasons: string[];
  summary: string;
}

/** First-person attack/defense explanation grounded in the board. */
export function explainMove(before: ChessGame, uci: string): MoveExplanation {
  const legal = before.legalMoves().find((m) => m.uci === uci);
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const pieceObj = before.pieceAt(from);
  const piece = pieceObj ? pieceName(pieceObj.role) : "piece";
  const san = legal?.san ?? before.sanForUci(uci) ?? uci;
  const mover = before.turn;

  const after = before.clone();
  after.playUci(uci);

  const attackReasons: string[] = [];
  const defenseReasons: string[] = [];
  const otherReasons: string[] = [];

  if (legal?.captured) {
    attackReasons.push(`capture your ${pieceName(legal.captured)} on ${to}`);
  }
  if (after.isCheck) attackReasons.push("put your king in check");

  if (san === "O-O" || san === "O-O-O") {
    defenseReasons.push(
      san === "O-O"
        ? "castle kingside to tuck my king behind a pawn shield and connect my rooks"
        : "castle queenside to safeguard my king and activate the rook"
    );
  }

  if (piece === "knight" || piece === "bishop") {
    const rank = Number(from[1]);
    if ((mover === "white" && rank === 1) || (mover === "black" && rank === 8)) {
      otherReasons.push(`develop my ${piece} into the game from ${from}`);
    }
  }
  if (
    CENTER.has(to) &&
    (piece === "pawn" || piece === "knight" || piece === "bishop")
  ) {
    attackReasons.push(`claim/control the central square ${to}`);
  }

  const oppCapturesAfter = capturableBySideToMove(after);
  for (const sq of allSquares()) {
    const p = after.pieceAt(sq);
    if (!p || p.color !== mover || sq === to) continue;
    if (!attacksSquare(after, to, sq, pieceObj?.role ?? piece)) continue;
    const threats = oppCapturesAfter.get(sq);
    defenseReasons.push(
      threats?.length
        ? `defend my ${pieceName(p.role)} on ${sq} (so I can recapture if you take it)`
        : `defend my ${pieceName(p.role)} on ${sq}`
    );
  }

  if (piece === "pawn" || piece === "knight" || piece === "king") {
    defenseReasons.push(`solidify control of the ${to} square`);
  }
  if (wasLikelyHanging(before, from, mover)) {
    defenseReasons.push(`get my ${piece} off ${from} where it was unsafe`);
  }

  for (const sq of allSquares()) {
    const p = after.pieceAt(sq);
    if (!p || p.color === mover) continue;
    if (!attacksSquare(after, to, sq, pieceObj?.role ?? piece)) continue;
    if (!legal?.captured || sq !== to) {
      attackReasons.push(`pressure your ${pieceName(p.role)} on ${sq}`);
    }
  }

  if ((piece === "rook" || piece === "queen") && from[0] !== to[0]) {
    otherReasons.push(`place my ${piece} on a more active file`);
  }

  const attacks = uniq(attackReasons);
  const defenses = uniq(defenseReasons);
  const others = uniq(otherReasons);

  if (!attacks.length && !defenses.length && !others.length) {
    others.push(
      piece === "pawn"
        ? `advance my pawn to ${to} to gain space and open lines`
        : `reposition my ${piece} from ${from} to ${to} for a better square`
    );
  }

  const purpose = [
    ...attacks,
    ...defenses,
    ...(purposeLength(attacks, defenses) < 2 ? others : []),
  ];

  const summary =
    purpose.length > 0
      ? `I moved my ${piece} to ${to} (${san}) to ${joinReasons(purpose.slice(0, 3))}.`
      : `I played ${san}, moving my ${piece} from ${from} to ${to}.`;

  return {
    san,
    uci,
    from,
    to,
    piece,
    attackReasons: attacks,
    defenseReasons: defenses,
    otherReasons: others,
    summary,
  };
}

function purposeLength(a: string[], d: string[]): number {
  return a.length + d.length;
}

export function describeUserMove(before: ChessGame, uci: string): string {
  const legal = before.legalMoves().find((m) => m.uci === uci);
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const p = before.pieceAt(from);
  const name = p ? pieceName(p.role) : "piece";
  const san = legal?.san ?? before.sanForUci(uci) ?? uci;
  if (legal?.captured) {
    return `you moved your ${name} to capture on ${to} (${san})`;
  }
  return `you moved your ${name} from ${from} to ${to} (${san})`;
}

export function describePrediction(
  beforeUserTurn: ChessGame,
  predictedUci: string
): string {
  const legal = beforeUserTurn
    .legalMoves()
    .find((m) => m.uci === predictedUci);
  const from = predictedUci.slice(0, 2);
  const to = predictedUci.slice(2, 4);
  const p = beforeUserTurn.pieceAt(from);
  const name = p ? pieceName(p.role) : "piece";
  const san =
    legal?.san ?? beforeUserTurn.sanForUci(predictedUci) ?? predictedUci;
  if (legal?.captured) {
    return `you will move your ${name} to capture my ${pieceName(legal.captured)} on ${to} (${san})`;
  }
  return `you will move your ${name} from ${from} to ${to} (${san})`;
}
