/**
 * Chess960 starting-position generator (Fischer Random).
 * Valid IDs: 0–959. Bishops on opposite colors, king between rooks.
 */

const FILES = "abcdefgh";

function place(arr: (string | null)[], piece: string, file: number) {
  arr[file] = piece;
}

/** Scharnagl algorithm for Chess960 back-rank placement (IDs 0–959). */
export function chess960BackRank(id: number): string {
  let n = ((id % 960) + 960) % 960;
  const rank: (string | null)[] = Array(8).fill(null);

  // Bishops on opposite colors
  place(rank, "b", (n % 4) * 2 + 1);
  n = Math.floor(n / 4);
  place(rank, "b", (n % 4) * 2);
  n = Math.floor(n / 4);

  // Queen on one of six remaining squares
  let empty = rank.map((p, i) => (p === null ? i : -1)).filter((i) => i >= 0);
  place(rank, "q", empty[n % 6]);
  n = Math.floor(n / 6);

  // Two knights among five remaining (10 combinations)
  const knightTable = [
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [1, 2],
    [1, 3],
    [1, 4],
    [2, 3],
    [2, 4],
    [3, 4],
  ];
  empty = rank.map((p, i) => (p === null ? i : -1)).filter((i) => i >= 0);
  const pair = knightTable[n];
  place(rank, "n", empty[pair[0]]);
  place(rank, "n", empty[pair[1]]);

  // Remaining three: rook, king, rook
  empty = rank.map((p, i) => (p === null ? i : -1)).filter((i) => i >= 0);
  place(rank, "r", empty[0]);
  place(rank, "k", empty[1]);
  place(rank, "r", empty[2]);

  return rank.join("");
}

export function chess960Fen(id?: number): string {
  const sid = id === undefined ? Math.floor(Math.random() * 960) : ((id % 960) + 960) % 960;
  const back = chess960BackRank(sid);
  const white = back.toUpperCase();
  const black = back.toLowerCase();

  // X-FEN castling rights: rook files (outer rooks) as A-H / a-h letters
  const rookFiles: number[] = [];
  for (let i = 0; i < 8; i++) {
    if (back[i] === "r") rookFiles.push(i);
  }
  const qFile = FILES[rookFiles[0]];
  const kFile = FILES[rookFiles[1]];
  const castling = `${kFile.toUpperCase()}${qFile.toUpperCase()}${kFile}${qFile}`;

  return `${black}/pppppppp/8/8/8/8/PPPPPPPP/${white} w ${castling} - 0 1`;
}

export function randomChess960Id(): number {
  return Math.floor(Math.random() * 960);
}
