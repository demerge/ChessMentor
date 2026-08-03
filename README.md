# ChessMentor

Teaching-first chess web app: every move gets a **pre-move intent** note and a **post-move outcome** classification, plus a post-game report.

## Variants

- **Standard** — classical chess  
- **Chess960** — Fischer random starting position  
- **Atomic** — captures explode (custom rules + JS AI)  
- **King of the Hill** — win by getting your king to d4/d5/e4/e5  

## Stack

| Layer | Choice |
|--------|--------|
| App | Next.js (App Router) + React + Tailwind |
| Rules | [chessops](https://github.com/niklasf/chessops) (Standard, 960, Atomic, KOTH) |
| AI | Stockfish 18 lite WASM (single-thread) + JS minimax fallback / Atomic AI |
| State | Zustand |
| Storage | IndexedDB (`idb-keyval`) — no accounts |
| Board | `react-chessboard` |

## Run

```bash
cd chessmentor
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features (v1)

- AI difficulty tiers (~800 → full strength) with blunder-shaping at low levels  
- Tutor Tier 1: deterministic templates + centipawn classification  
- Hint, takeback, resign, board flip  
- Move list with classification icons  
- Local game history + PGN export + eval graph report  

## Project layout

See `src/engines/` (rules, AI, tutor), `src/components/`, `src/store/`, `src/app/`.

## License notes

- Stockfish.js is GPLv3 (see `node_modules/stockfish/Copying.txt`).  
- Piece graphics come from `react-chessboard` defaults.
