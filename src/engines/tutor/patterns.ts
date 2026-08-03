import type { ChessGame } from "@/engines/rules/game";
import { allSquares, attacksSquare } from "@/engines/rules/attacks";
import type { PatternHit, PatternId } from "@/lib/tutorTypes";
import { MOTIF_LABELS, TACTICAL_RADAR_ORDER } from "@/lib/tutorTypes";

const FILES = "abcdefgh";

const attacks = attacksSquare;

function piecesOf(game: ChessGame, color: "white" | "black") {
  const out: { sq: string; role: string }[] = [];
  for (const sq of allSquares()) {
    const p = game.pieceAt(sq);
    if (p && p.color === color) out.push({ sq, role: p.role });
  }
  return out;
}

function kingSq(game: ChessGame, color: "white" | "black"): string | null {
  for (const sq of allSquares()) {
    const p = game.pieceAt(sq);
    if (p?.role === "king" && p.color === color) return sq;
  }
  return null;
}

/**
 * Detect live patterns in the position for pattern recognition + tactical radar.
 */
export function detectPatterns(game: ChessGame): PatternHit[] {
  const hits: PatternHit[] = [];
  const stm = game.turn;
  const opp: "white" | "black" = stm === "white" ? "black" : "white";
  const ours = piecesOf(game, stm);
  const theirs = piecesOf(game, opp);
  const ourKing = kingSq(game, stm);
  const theirKing = kingSq(game, opp);

  // Hanging pieces (capturable by side to move)
  const captures = game.legalMoves().filter((m) => m.captured);
  if (captures.length) {
    const squares = [...new Set(captures.map((m) => m.to))];
    hits.push({
      id: "hanging_piece",
      label: MOTIF_LABELS.hanging_piece,
      squares,
      arrows: captures.slice(0, 3).map((m) => ({
        from: m.from,
        to: m.to,
        color: "#D0361E",
      })),
      description: `${captures.length} capture(s) available — check if pieces are hanging or under-defended.`,
      available: true,
    });
  }

  // Forks: one of our pieces attacks 2+ valuable enemy units
  for (const { sq, role } of ours) {
    if (role === "king") continue;
    const attacked = theirs.filter((t) => attacks(game, sq, t.sq, role));
    const valuable = attacked.filter(
      (t) => t.role === "king" || t.role === "queen" || t.role === "rook" || t.role === "knight" || t.role === "bishop"
    );
    if (valuable.length >= 2) {
      hits.push({
        id: "fork",
        label: MOTIF_LABELS.fork,
        squares: [sq, ...valuable.map((v) => v.sq)],
        arrows: valuable.map((v) => ({ from: sq, to: v.sq, color: "#3C6E47" })),
        description: `Your ${role} on ${sq} attacks ${valuable.length} pieces at once — a fork pattern.`,
        available: true,
      });
    }
  }

  // Pins / skewers on files/ranks/diagonals toward king
  for (const { sq, role } of ours) {
    if (role !== "rook" && role !== "bishop" && role !== "queen") continue;
    if (!theirKing) continue;
    // see if something sits between attacker and king on a line
    const between = piecesBetween(game, sq, theirKing);
    if (between.length === 1 && between[0].color === opp) {
      const mid = between[0];
      const isPin = true;
      hits.push({
        id: isPin ? "pin" : "skewer",
        label: MOTIF_LABELS.pin,
        squares: [sq, mid.sq, theirKing],
        arrows: [
          { from: sq, to: mid.sq, color: "#D0361E" },
          { from: mid.sq, to: theirKing, color: "#D0361E" },
        ],
        description: `Pin: your ${role} on ${sq} freezes the ${mid.role} on ${mid.sq} against the king.`,
        available: true,
      });
    }
    // skewer: more valuable behind less valuable
    if (between.length === 1 && between[0].color === opp) {
      /* already pin */
    }
  }

  // Battery: two of our sliders on same line
  for (let i = 0; i < ours.length; i++) {
    for (let j = i + 1; j < ours.length; j++) {
      const a = ours[i];
      const b = ours[j];
      const sliders = ["rook", "queen", "bishop"];
      if (!sliders.includes(a.role) || !sliders.includes(b.role)) continue;
      if (aligned(a.sq, b.sq)) {
        hits.push({
          id: "battery",
          label: MOTIF_LABELS.battery,
          squares: [a.sq, b.sq],
          arrows: [{ from: a.sq, to: b.sq, color: "#1A1A1A" }],
          description: `Battery: ${a.role} and ${b.role} aligned for power on a line.`,
          available: true,
        });
      }
    }
  }

  // Back rank weakness
  if (theirKing) {
    const rank = theirKing[1];
    const back = opp === "black" ? "8" : "1";
    if (rank === back) {
      const escapes = [ -1, 0, 1 ].some((df) => {
        const f = theirKing.charCodeAt(0) - 97 + df;
        const r = opp === "black" ? 7 : 2;
        if (f < 0 || f > 7) return false;
        return !game.pieceAt(`${FILES[f]}${r}`);
      });
      // rook/queen check possible on back rank
      const heavy = ours.some(
        (o) =>
          (o.role === "rook" || o.role === "queen") &&
          o.sq[1] === back
      );
      if (!escapes || heavy) {
        hits.push({
          id: "back_rank",
          label: MOTIF_LABELS.back_rank,
          squares: [theirKing],
          description: "Back-rank pressure: limited luft (escape squares) for the enemy king.",
          available: true,
        });
      }
    }
  }

  // Mate threat if any legal move is checkmate
  for (const m of game.legalMoves().slice(0, 40)) {
    const c = game.clone();
    c.playUci(m.uci);
    const o = c.snapshot();
    if (o.isGameOver && o.result !== "1/2-1/2" && o.endReason === "Checkmate") {
      hits.push({
        id: "mate_threat",
        label: MOTIF_LABELS.mate_threat,
        squares: [m.from, m.to],
        arrows: [{ from: m.from, to: m.to, color: "#D0361E" }],
        description: `Mate threat: ${m.san} would checkmate.`,
        available: true,
      });
      break;
    }
  }

  // Isolated / doubled pawns (structural)
  const pawnFiles: Record<string, number[]> = { white: Array(8).fill(0), black: Array(8).fill(0) };
  for (const sq of allSquares()) {
    const p = game.pieceAt(sq);
    if (p?.role === "pawn") {
      pawnFiles[p.color][sq.charCodeAt(0) - 97]++;
    }
  }
  for (const color of ["white", "black"] as const) {
    const counts = pawnFiles[color];
    for (let f = 0; f < 8; f++) {
      if (counts[f] > 1) {
        hits.push({
          id: "doubled_pawn",
          label: MOTIF_LABELS.doubled_pawn,
          squares: allSquares().filter(
            (s) =>
              s.charCodeAt(0) - 97 === f &&
              game.pieceAt(s)?.role === "pawn" &&
              game.pieceAt(s)?.color === color
          ),
          description: `Doubled pawns on the ${FILES[f]}-file (${color}).`,
          available: true,
        });
      }
      if (counts[f] > 0 && (counts[f - 1] || 0) === 0 && (counts[f + 1] || 0) === 0) {
        hits.push({
          id: "isolated_pawn",
          label: MOTIF_LABELS.isolated_pawn,
          squares: allSquares().filter(
            (s) =>
              s.charCodeAt(0) - 97 === f &&
              game.pieceAt(s)?.role === "pawn" &&
              game.pieceAt(s)?.color === color
          ),
          description: `Isolated pawn on the ${FILES[f]}-file (${color}).`,
          available: true,
        });
      }
    }
  }

  // Open files
  for (let f = 0; f < 8; f++) {
    let pawns = 0;
    for (let r = 1; r <= 8; r++) {
      if (game.pieceAt(`${FILES[f]}${r}`)?.role === "pawn") pawns++;
    }
    if (pawns === 0) {
      const rooks = allSquares().filter((s) => {
        const p = game.pieceAt(s);
        return p && (p.role === "rook" || p.role === "queen") && s[0] === FILES[f];
      });
      if (rooks.length) {
        hits.push({
          id: "open_file",
          label: MOTIF_LABELS.open_file,
          squares: rooks,
          description: `Open ${FILES[f]}-file with heavy pieces — classic rook highway.`,
          available: true,
        });
      }
    }
  }

  // Development (opening): undeveloped minors
  const startRank = stm === "white" ? "1" : "8";
  const undeveloped = ours.filter(
    (o) =>
      (o.role === "knight" || o.role === "bishop") && o.sq[1] === startRank
  );
  if (undeveloped.length >= 2 && game.snapshot().moveNumber <= 12) {
    hits.push({
      id: "development",
      label: MOTIF_LABELS.development,
      squares: undeveloped.map((u) => u.sq),
      description: "Minor pieces still at home — prioritize development.",
      available: true,
    });
  }

  // King safety flag
  if (ourKing) {
    const file = ourKing.charCodeAt(0) - 97;
    if (file >= 2 && file <= 5 && game.snapshot().moveNumber > 6) {
      hits.push({
        id: "king_safety",
        label: MOTIF_LABELS.king_safety,
        squares: [ourKing],
        description: "Your king is still central — castling and luft matter.",
        available: true,
      });
    }
  }

  // Deduplicate by id keeping first rich hit
  const byId = new Map<string, PatternHit>();
  for (const h of hits) {
    if (!byId.has(h.id)) byId.set(h.id, h);
  }
  return [...byId.values()];
}

function piecesBetween(
  game: ChessGame,
  from: string,
  to: string
): { sq: string; role: string; color: "white" | "black" }[] {
  const ff = from.charCodeAt(0) - 97;
  const fr = Number(from[1]);
  const tf = to.charCodeAt(0) - 97;
  const tr = Number(to[1]);
  const df = Math.sign(tf - ff);
  const dr = Math.sign(tr - fr);
  if (df !== 0 && dr !== 0 && Math.abs(tf - ff) !== Math.abs(tr - fr)) return [];
  if (df === 0 && dr === 0) return [];
  const out: { sq: string; role: string; color: "white" | "black" }[] = [];
  let f = ff + df;
  let r = fr + dr;
  while (f !== tf || r !== tr) {
    const sq = `${FILES[f]}${r}`;
    const p = game.pieceAt(sq);
    if (p) out.push({ sq, role: p.role, color: p.color });
    f += df;
    r += dr;
  }
  return out;
}

function aligned(a: string, b: string): boolean {
  return a[0] === b[0] || a[1] === b[1] ||
    Math.abs(a.charCodeAt(0) - b.charCodeAt(0)) === Math.abs(Number(a[1]) - Number(b[1]));
}

/** Full radar list with unavailable greys */
export function tacticalRadar(game: ChessGame): PatternHit[] {
  const live = detectPatterns(game);
  return TACTICAL_RADAR_ORDER.map((t) => {
    const hit = live.find((l) => l.id === t.id);
    if (hit) return hit;
    return {
      id: t.id,
      label: t.label,
      squares: [],
      description: "Not active in this position.",
      available: false,
    };
  }).concat(
    live.filter((l) => !TACTICAL_RADAR_ORDER.some((t) => t.id === l.id))
  );
}

export function motifsFromMove(
  before: ChessGame,
  uci: string
): PatternId[] {
  const after = before.clone();
  if (!after.playUci(uci)) return [];
  const beforeP = detectPatterns(before).filter((p) => p.available).map((p) => p.id);
  const afterP = detectPatterns(after).filter((p) => p.available).map((p) => p.id);
  // motifs that appear or captures
  const created = afterP.filter((id) => !beforeP.includes(id));
  const m = before.legalMoves().find((x) => x.uci === uci);
  if (m?.captured) created.push("hanging_piece");
  if (after.isCheck) created.push("mate_threat");
  // fork detection on landing square
  const to = uci.slice(2, 4);
  const piece = after.pieceAt(to);
  if (piece) {
    const opp = piece.color === "white" ? "black" : "white";
    const targets = piecesOf(after, opp).filter((t) =>
      attacks(after, to, t.sq, piece.role)
    );
    if (targets.length >= 2) created.push("fork");
  }
  return [...new Set(created)];
}

