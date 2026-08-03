import type { ChessGame } from "@/engines/rules/game";
import type { PrincipleAlert } from "@/lib/tutorTypes";

/**
 * Contextual chess principles — shown when relevant, not as static lectures.
 */
export function detectPrinciples(
  game: ChessGame,
  historySan: string[],
  playerColor: "white" | "black"
): PrincipleAlert[] {
  const alerts: PrincipleAlert[] = [];
  const moveNo = game.snapshot().moveNumber;
  const playerSans = historySan.filter((_, i) =>
    playerColor === "white" ? i % 2 === 0 : i % 2 === 1
  );

  // Queen early / repeated
  const queenMovesAll = playerSans.filter((s) => s.startsWith("Q")).length;
  if (moveNo <= 10 && queenMovesAll >= 2) {
    alerts.push({
      id: "queen_early",
      title: "Queen wandering early",
      principle:
        "Develop minor pieces (knights and bishops) before repeatedly moving the queen.",
      context: `You've moved the queen ${queenMovesAll} time(s) in the opening. Each queen move is a tempo opponents can use to develop with threats.`,
    });
  }

  // King uncastled midgame
  const king = findKing(game, playerColor);
  if (king && moveNo >= 8 && moveNo <= 25) {
    const file = king.charCodeAt(0) - 97;
    if (file >= 2 && file <= 5) {
      const castled = playerSans.some((s) => s === "O-O" || s === "O-O-O");
      if (!castled) {
        alerts.push({
          id: "castle_late",
          title: "King still in the center",
          principle: "Castle early unless you have a concrete reason not to.",
          context:
            "Your king remains on a central file. Center files open as pawns trade — king safety becomes urgent.",
        });
      }
    }
  }

  // Same piece thrice
  const pieceCounts: Record<string, number> = {};
  for (const s of playerSans.slice(-8)) {
    const ch = s[0];
    if ("NBRQK".includes(ch)) pieceCounts[ch] = (pieceCounts[ch] || 0) + 1;
  }
  for (const [ch, n] of Object.entries(pieceCounts)) {
    if (n >= 3) {
      alerts.push({
        id: `repeat_${ch}`,
        title: "One piece, many moves",
        principle:
          "Avoid moving the same piece repeatedly while others sit undeveloped.",
        context: `Recent play reuses your ${pieceName(ch)} heavily (${n} times). Ask whether another piece can join the fight.`,
      });
    }
  }

  // Don't hang — if many hanging available for opponent next... handled elsewhere

  // Pawn grab with undeveloped
  if (moveNo <= 12) {
    const undeveloped = countUndeveloped(game, playerColor);
    const last = playerSans[playerSans.length - 1];
    if (undeveloped >= 3 && last?.includes("x") && last.startsWith("Q")) {
      alerts.push({
        id: "poisoned_pawn_risk",
        title: "Grabbing with the queen",
        principle:
          "Before snatching pawns with the queen, finish development and ensure king safety.",
        context:
          "Queen captures in the opening often waste tempi and can walk into traps.",
      });
    }
  }

  // Rook lift / open file — positive
  const last = playerSans[playerSans.length - 1];
  if (last?.startsWith("R") && moveNo > 10) {
    alerts.push({
      id: "rook_active",
      title: "Rook activity",
      principle: "Rooks belong on open or semi-open files.",
      context: "You're involving a rook — check that the file is useful and the back rank stays safe.",
    });
  }

  return alerts.slice(0, 2);
}

function findKing(game: ChessGame, color: "white" | "black"): string | null {
  for (const f of "abcdefgh") {
    for (let r = 1; r <= 8; r++) {
      const p = game.pieceAt(`${f}${r}`);
      if (p?.role === "king" && p.color === color) return `${f}${r}`;
    }
  }
  return null;
}

function countUndeveloped(game: ChessGame, color: "white" | "black"): number {
  const rank = color === "white" ? "1" : "8";
  let n = 0;
  for (const f of "abcdefgh") {
    const p = game.pieceAt(`${f}${rank}`);
    if (p && p.color === color && (p.role === "knight" || p.role === "bishop"))
      n++;
  }
  return n;
}

function pieceName(ch: string): string {
  return (
    { N: "knight", B: "bishop", R: "rook", Q: "queen", K: "king" }[ch] ??
    "piece"
  );
}
