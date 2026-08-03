import type { ChessGame } from "@/engines/rules/game";
import { allSquares, attacksSquare } from "@/engines/rules/attacks";
import type { HoverInsight } from "@/lib/tutorTypes";

const attacksRough = attacksSquare;

/**
 * Educational hover: role, controlled squares, what hanging if moved.
 */
export function getHoverInsight(
  game: ChessGame,
  square: string
): HoverInsight | null {
  const piece = game.pieceAt(square);
  if (!piece) return null;

  const controls: string[] = [];
  const roles: string[] = [];

  for (const sq of allSquares()) {
    if (attacksRough(game, square, sq, piece.role)) {
      controls.push(sq);
    }
  }

  // Defending king?
  let kingSq: string | null = null;
  for (const sq of allSquares()) {
    const p = game.pieceAt(sq);
    if (p?.role === "king" && p.color === piece.color) kingSq = sq;
  }
  if (kingSq && controls.includes(kingSq)) {
    roles.push("Defending the king sector");
  } else if (kingSq && attacksRough(game, square, kingSq, piece.role)) {
    roles.push("Near the king");
  }

  // Defending friendly pieces
  let defends = 0;
  for (const sq of controls) {
    const p = game.pieceAt(sq);
    if (p && p.color === piece.color) {
      defends++;
      roles.push(`Defending ${p.role} on ${sq}`);
    }
  }
  if (defends === 0 && piece.role !== "king") {
    roles.push("Not currently glued to a defender role");
  }

  // Center control
  const center = controls.filter((s) =>
    ["d4", "d5", "e4", "e5", "c4", "c5", "f4", "f5"].includes(s)
  );
  if (center.length) {
    roles.push(`Controls ${center.slice(0, 4).join(", ")}`);
  }

  // What becomes undefended if this piece moves
  const leavingWarnings: string[] = [];
  for (const sq of allSquares()) {
    const p = game.pieceAt(sq);
    if (!p || p.color !== piece.color || sq === square) continue;
    // if we are only geometric defender
    if (!attacksRough(game, square, sq, piece.role)) continue;
    let otherDef = 0;
    for (const s2 of allSquares()) {
      if (s2 === square) continue;
      const d = game.pieceAt(s2);
      if (d && d.color === piece.color && attacksRough(game, s2, sq, d.role)) {
        otherDef++;
      }
    }
    if (otherDef === 0) {
      leavingWarnings.push(
        `${p.role[0].toUpperCase()}${p.role.slice(1)} on ${sq} would be undefended`
      );
    }
  }

  // Legal moves from here
  const moves = game.legalMoves().filter((m) => m.from === square);
  if (moves.length === 0 && game.turn === piece.color) {
    roles.push("Currently has no legal moves (pinned or blocked)");
  } else if (moves.length) {
    roles.push(`${moves.length} legal destination${moves.length > 1 ? "s" : ""}`);
  }

  return {
    square,
    piece: `${piece.color} ${piece.role}`,
    roles: [...new Set(roles)].slice(0, 5),
    controls: controls.slice(0, 12),
    leavingWarnings: leavingWarnings.slice(0, 4),
  };
}

/** Vision overlay squares */
export function visionSquares(
  game: ChessGame,
  mode: "attacked" | "undefended" | "weak",
  forColor: "white" | "black"
): string[] {
  const opp = forColor === "white" ? "black" : "white";
  const result: string[] = [];

  if (mode === "attacked") {
    // squares attacked by opponent
    for (const sq of allSquares()) {
      for (const s2 of allSquares()) {
        const p = game.pieceAt(s2);
        if (p && p.color === opp && attacksRough(game, s2, sq, p.role)) {
          result.push(sq);
          break;
        }
      }
    }
    return [...new Set(result)];
  }

  if (mode === "undefended") {
    for (const sq of allSquares()) {
      const p = game.pieceAt(sq);
      if (!p || p.color !== forColor) continue;
      let defenders = 0;
      let attackers = 0;
      for (const s2 of allSquares()) {
        const d = game.pieceAt(s2);
        if (!d) continue;
        if (d.color === forColor && attacksRough(game, s2, sq, d.role))
          defenders++;
        if (d.color === opp && attacksRough(game, s2, sq, d.role)) attackers++;
      }
      if (attackers > 0 && defenders === 0) result.push(sq);
      if (attackers > defenders) result.push(sq);
    }
    return [...new Set(result)];
  }

  // weak squares: holes in front of king / complex without pawn control
  for (const sq of allSquares()) {
    if (game.pieceAt(sq)) continue;
    let ourPawns = 0;
    let theirControl = 0;
    for (const s2 of allSquares()) {
      const p = game.pieceAt(s2);
      if (!p) continue;
      if (p.role === "pawn" && p.color === forColor && attacksRough(game, s2, sq, "pawn"))
        ourPawns++;
      if (p.color === opp && attacksRough(game, s2, sq, p.role)) theirControl++;
    }
    if (ourPawns === 0 && theirControl >= 1) {
      const rank = Number(sq[1]);
      if (
        (forColor === "white" && rank >= 3 && rank <= 5) ||
        (forColor === "black" && rank >= 4 && rank <= 6)
      ) {
        result.push(sq);
      }
    }
  }
  return [...new Set(result)].slice(0, 24);
}

export function buildGuidedChecklist(game: ChessGame): {
  kingExposed: boolean;
  items: { id: string; label: string; checked: boolean; hint?: string }[];
} {
  const stm = game.turn;
  let kingSq: string | null = null;
  for (const sq of allSquares()) {
    const p = game.pieceAt(sq);
    if (p?.role === "king" && p.color === stm) kingSq = sq;
  }
  const file = kingSq ? kingSq.charCodeAt(0) - 97 : 4;
  const kingExposed = file >= 2 && file <= 5 && game.snapshot().moveNumber > 5;

  const hanging = game.legalMoves().filter((m) => m.captured).length;
  const checks = game.legalMoves().filter((m) => {
    const c = game.clone();
    c.playUci(m.uci);
    return c.isCheck;
  }).length;

  return {
    kingExposed,
    items: [
      {
        id: "hanging",
        label: "Is anything hanging?",
        checked: false,
        hint:
          hanging > 0
            ? `There are ${hanging} capture(s) available this turn — scan every one.`
            : "No immediate captures for you — still check if YOUR pieces hang next move.",
      },
      {
        id: "checks",
        label: "Can my opponent check me after I move?",
        checked: false,
        hint: "Mentally play your move, then look for checks against you.",
      },
      {
        id: "tactics",
        label: "Are there tactical opportunities?",
        checked: false,
        hint:
          checks > 0
            ? `You have ${checks} checking move(s) — forcing moves first.`
            : "Search checks, captures, threats (CCT) before quiet moves.",
      },
      {
        id: "activity",
        label: "Which piece is least active?",
        checked: false,
        hint: "Improve your worst piece before making a second move with your best one.",
      },
    ],
  };
}
