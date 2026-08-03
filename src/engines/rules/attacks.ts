import type { ChessGame } from "./game";

const FILES = "abcdefgh";

export function allSquares(): string[] {
  const out: string[] = [];
  for (let r = 1; r <= 8; r++) {
    for (const f of FILES) out.push(`${f}${r}`);
  }
  return out;
}

/** Geometry-based attack check (not full chess legality for pins). */
export function attacksSquare(
  game: ChessGame,
  from: string,
  to: string,
  role: string
): boolean {
  if (from === to) return false;
  const ff = from.charCodeAt(0) - 97;
  const fr = Number(from[1]);
  const tf = to.charCodeAt(0) - 97;
  const tr = Number(to[1]);
  const df = tf - ff;
  const dr = tr - fr;
  const adf = Math.abs(df);
  const adr = Math.abs(dr);

  const clear = (dsf: number, dsr: number) => {
    let f = ff + dsf;
    let r = fr + dsr;
    while (f !== tf || r !== tr) {
      if (game.pieceAt(`${FILES[f]}${r}`)) return false;
      f += dsf;
      r += dsr;
    }
    return true;
  };

  switch (role) {
    case "knight":
      return (adf === 1 && adr === 2) || (adf === 2 && adr === 1);
    case "king":
      return adf <= 1 && adr <= 1;
    case "pawn":
      return adf === 1 && adr === 1;
    case "bishop":
      return adf === adr && adf > 0 && clear(Math.sign(df), Math.sign(dr));
    case "rook":
      return (
        ((adf === 0 && adr > 0) || (adr === 0 && adf > 0)) &&
        clear(Math.sign(df), Math.sign(dr))
      );
    case "queen":
      return (
        ((adf === adr && adf > 0) || adf === 0 || adr === 0) &&
        adf + adr > 0 &&
        clear(Math.sign(df) || 0, Math.sign(dr) || 0)
      );
    default:
      return false;
  }
}
