import {
  Chess,
  type Color,
  type Move,
  type NormalMove,
  type Role,
  makeSquare,
  parseSquare,
  isNormal,
} from "chessops";
import { chessgroundDests } from "chessops/compat";
import { makeFen, parseFen } from "chessops/fen";
import { makeSan, parseSan } from "chessops/san";
import { makeUci, parseUci } from "chessops/util";
import { Atomic, KingOfTheHill, setupPosition } from "chessops/variant";
import type { Variant } from "@/lib/types";
import { chess960Fen, randomChess960Id } from "./chess960";

export interface LegalMove {
  from: string;
  to: string;
  promotion?: Role;
  san: string;
  uci: string;
  captured?: Role;
}

export interface GameSnapshot {
  fen: string;
  turn: "white" | "black";
  isCheck: boolean;
  isGameOver: boolean;
  result: "1-0" | "0-1" | "1/2-1/2" | "*";
  endReason?: string;
  dests: Map<string, string[]>;
  historySan: string[];
  historyUci: string[];
  moveNumber: number;
  variant: Variant;
  chess960Id?: number;
}

type Pos = Chess | Atomic | KingOfTheHill;

function createPosition(variant: Variant, fen?: string, chess960Id?: number): {
  pos: Pos;
  chess960Id?: number;
} {
  if (variant === "chess960") {
    const id = chess960Id ?? randomChess960Id();
    const startFen = fen ?? chess960Fen(id);
    const setup = parseFen(startFen).unwrap();
    const result = Chess.fromSetup(setup);
    if (result.isErr) {
      // fallback standard if malformed
      return { pos: Chess.default(), chess960Id: id };
    }
    return { pos: result.unwrap(), chess960Id: id };
  }

  if (fen) {
    const setup = parseFen(fen).unwrap();
    const rules =
      variant === "atomic"
        ? "atomic"
        : variant === "koth"
          ? "kingofthehill"
          : "chess";
    const result = setupPosition(rules, setup);
    if (!result || result.isErr) {
      return { pos: defaultFor(variant) };
    }
    return { pos: result.unwrap() as Pos };
  }

  return { pos: defaultFor(variant) };
}

function defaultFor(variant: Variant): Pos {
  if (variant === "atomic") return Atomic.default();
  if (variant === "koth") return KingOfTheHill.default();
  return Chess.default();
}

function colorToStr(c: Color): "white" | "black" {
  return c === "white" ? "white" : "black";
}

function outcomeOf(pos: Pos): {
  result: "1-0" | "0-1" | "1/2-1/2" | "*";
  endReason?: string;
  isGameOver: boolean;
} {
  const o = pos.outcome();
  if (!o) {
    return { result: "*", isGameOver: false };
  }
  if (o.winner === "white") {
    return {
      result: "1-0",
      endReason: pos.isCheckmate() ? "Checkmate" : variantEndReason(pos),
      isGameOver: true,
    };
  }
  if (o.winner === "black") {
    return {
      result: "0-1",
      endReason: pos.isCheckmate() ? "Checkmate" : variantEndReason(pos),
      isGameOver: true,
    };
  }
  let reason = "Draw";
  if (pos.isStalemate()) reason = "Stalemate";
  else if (pos.isInsufficientMaterial()) reason = "Insufficient material";
  else if (pos.isVariantEnd()) reason = variantEndReason(pos) || "Variant end";
  return { result: "1/2-1/2", endReason: reason, isGameOver: true };
}

function variantEndReason(pos: Pos): string {
  if (pos.rules === "kingofthehill") return "King of the Hill";
  if (pos.rules === "atomic") return "Atomic explosion / king destroyed";
  return "Game over";
}

function destsMap(pos: Pos): Map<string, string[]> {
  const cg = chessgroundDests(pos);
  const map = new Map<string, string[]>();
  for (const [from, tos] of cg.entries()) {
    // chessops may return string[] or a space-joined string depending on version
    const list = Array.isArray(tos) ? tos.map(String) : String(tos).split(" ");
    map.set(from, list);
  }
  return map;
}

export class ChessGame {
  private pos: Pos;
  readonly variant: Variant;
  readonly chess960Id?: number;
  private _historySan: string[] = [];
  private _historyUci: string[] = [];
  private _fenHistory: string[] = [];
  private _startFen: string;

  constructor(variant: Variant = "standard", fen?: string, chess960Id?: number) {
    const created = createPosition(variant, fen, chess960Id);
    this.pos = created.pos;
    this.variant = variant;
    this.chess960Id = created.chess960Id;
    this._startFen = makeFen(this.pos.toSetup());
    this._fenHistory = [this._startFen];
  }

  get fen(): string {
    return makeFen(this.pos.toSetup());
  }

  get turn(): "white" | "black" {
    return colorToStr(this.pos.turn);
  }

  get isCheck(): boolean {
    return this.pos.isCheck();
  }

  get historySan(): string[] {
    return [...this._historySan];
  }

  get historyUci(): string[] {
    return [...this._historyUci];
  }

  get fenHistory(): string[] {
    return [...this._fenHistory];
  }

  get startFen(): string {
    return this._startFen;
  }

  snapshot(): GameSnapshot {
    const out = outcomeOf(this.pos);
    return {
      fen: this.fen,
      turn: this.turn,
      isCheck: this.isCheck,
      isGameOver: out.isGameOver,
      result: out.result,
      endReason: out.endReason,
      dests: destsMap(this.pos),
      historySan: this.historySan,
      historyUci: this.historyUci,
      moveNumber: this.pos.fullmoves,
      variant: this.variant,
      chess960Id: this.chess960Id,
    };
  }

  legalMoves(): LegalMove[] {
    const moves: LegalMove[] = [];
    const ctx = this.pos.ctx();
    for (const [from, tos] of this.pos.allDests(ctx)) {
      for (const to of tos) {
        const candidates: Move[] = [{ from, to }];
        // promotions
        const piece = this.pos.board.get(from);
        if (
          piece?.role === "pawn" &&
          ((piece.color === "white" && to >= 56) ||
            (piece.color === "black" && to < 8))
        ) {
          for (const promotion of ["queen", "rook", "bishop", "knight"] as Role[]) {
            candidates.push({ from, to, promotion });
          }
          // remove bare non-promotion
          candidates.shift();
        }

        for (const move of candidates) {
          const clone = this.pos.clone();
          if (!clone.isLegal(move, ctx)) continue;
          const san = makeSan(this.pos, move);
          const uci = makeUci(move);
          const target = this.pos.board.get(to);
          moves.push({
            from: makeSquare(from),
            to: makeSquare(to),
            promotion: isNormal(move) ? move.promotion : undefined,
            san,
            uci,
            captured: target?.role,
          });
        }
      }
    }
    return moves;
  }

  isLegalUci(uci: string): boolean {
    const move = parseUci(uci);
    if (!move) return false;
    return this.pos.isLegal(move);
  }

  playUci(uci: string): boolean {
    const move = parseUci(uci);
    if (!move || !this.pos.isLegal(move)) return false;
    const san = makeSan(this.pos, move);
    this.pos.play(move);
    this._historySan.push(san);
    this._historyUci.push(makeUci(move));
    this._fenHistory.push(this.fen);
    return true;
  }

  playSan(san: string): boolean {
    const move = parseSan(this.pos, san);
    if (!move || !this.pos.isLegal(move)) return false;
    return this.playUci(makeUci(move));
  }

  playFromTo(from: string, to: string, promotion?: Role): boolean {
    const fromSq = parseSquare(from);
    const toSq = parseSquare(to);
    if (fromSq === undefined || toSq === undefined) return false;
    const move: NormalMove = { from: fromSq, to: toSq, promotion };
    // auto-queen if promotion needed and not specified
    const piece = this.pos.board.get(fromSq);
    if (
      piece?.role === "pawn" &&
      !promotion &&
      ((piece.color === "white" && toSq >= 56) ||
        (piece.color === "black" && toSq < 8))
    ) {
      move.promotion = "queen";
    }
    if (!this.pos.isLegal(move)) return false;
    return this.playUci(makeUci(move));
  }

  undo(): boolean {
    if (this._historyUci.length === 0) return false;
    const ucis = this._historyUci.slice(0, -1);
    const restart = createPosition(this.variant, this._startFen, this.chess960Id);
    this.pos = restart.pos;
    this._historySan = [];
    this._historyUci = [];
    this._fenHistory = [this._startFen];
    for (const u of ucis) {
      this.playUci(u);
    }
    return true;
  }

  sanForUci(uci: string): string | undefined {
    const move = parseUci(uci);
    if (!move || !this.pos.isLegal(move)) return undefined;
    return makeSan(this.pos, move);
  }

  pieceAt(square: string): { role: Role; color: Color } | undefined {
    const sq = parseSquare(square);
    if (sq === undefined) return undefined;
    return this.pos.board.get(sq);
  }

  /** Material count in centipawns-ish pawn units. */
  material(): { white: number; black: number } {
    const values: Record<Role, number> = {
      pawn: 1,
      knight: 3,
      bishop: 3,
      rook: 5,
      queen: 9,
      king: 0,
    };
    let white = 0;
    let black = 0;
    for (const sq of this.pos.board.occupied) {
      const p = this.pos.board.get(sq);
      if (!p) continue;
      const v = values[p.role];
      if (p.color === "white") white += v;
      else black += v;
    }
    return { white, black };
  }

  clone(): ChessGame {
    const g = new ChessGame(this.variant, this._startFen, this.chess960Id);
    for (const u of this._historyUci) g.playUci(u);
    return g;
  }

  toPgn(headers: Record<string, string> = {}): string {
    const h: Record<string, string> = {
      Event: "ChessMentor Game",
      Site: "ChessMentor",
      Date: new Date().toISOString().slice(0, 10).replace(/-/g, "."),
      Round: "-",
      White: headers.White ?? "Player",
      Black: headers.Black ?? "AI",
      Result: headers.Result ?? "*",
      Variant:
        this.variant === "standard"
          ? "Standard"
          : this.variant === "chess960"
            ? "Chess960"
            : this.variant === "atomic"
              ? "Atomic"
              : "King of the Hill",
      ...headers,
    };
    if (this.variant === "chess960" && this.chess960Id !== undefined) {
      h.FEN = this._startFen;
      h.SetUp = "1";
      h.Variant = "Chess960";
    } else if (this._startFen !== makeFen(Chess.default().toSetup())) {
      h.FEN = this._startFen;
      h.SetUp = "1";
    }

    const lines = Object.entries(h).map(([k, v]) => `[${k} "${v}"]`);
    lines.push("");

    const sans = this._historySan;
    const parts: string[] = [];
    for (let i = 0; i < sans.length; i++) {
      if (i % 2 === 0) parts.push(`${Math.floor(i / 2) + 1}.`);
      parts.push(sans[i]);
    }
    parts.push(h.Result);
    lines.push(parts.join(" "));
    return lines.join("\n");
  }
}
