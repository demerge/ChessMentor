import type { AiTier, EngineLine } from "@/lib/types";
import { difficultyConfig, shapeMove, analysisBudget } from "./difficulty";

type Pending = {
  resolve: (lines: EngineLine[]) => void;
  reject: (err: Error) => void;
  lines: Map<number, EngineLine>;
  timer: ReturnType<typeof setTimeout>;
};

/**
 * Client-side Stockfish (lite single-thread WASM).
 * Serializes searches and always hard-times-out so the UI never hangs.
 */
export class StockfishClient {
  private worker: Worker | null = null;
  private ready = false;
  private starting: Promise<void> | null = null;
  private pending: Pending | null = null;
  private chain: Promise<void> = Promise.resolve();
  private failed = false;

  async init(): Promise<void> {
    if (this.ready) return;
    if (this.failed) throw new Error("Stockfish previously failed");
    if (this.starting) return this.starting;

    this.starting = new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (err?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (err) {
          this.failed = true;
          this.starting = null;
          try {
            this.worker?.terminate();
          } catch {
            /* ignore */
          }
          this.worker = null;
          reject(err);
        } else {
          this.ready = true;
          this.starting = null;
          resolve();
        }
      };

      const timeout = setTimeout(() => {
        finish(new Error("Stockfish init timeout"));
      }, 15000);

      try {
        // classic worker — WASM resolves next to the .js path
        this.worker = new Worker("/engines/stockfish-18-lite-single.js");
      } catch (e) {
        finish(e instanceof Error ? e : new Error(String(e)));
        return;
      }

      let sawUciOk = false;

      this.worker.onmessage = (e: MessageEvent) => {
        const line = this.normalizeMessage(e.data);
        if (!line) return;

        // Always route search output first
        this.handleLine(line);

        if (!sawUciOk && (line === "uciok" || line.startsWith("uciok"))) {
          sawUciOk = true;
          this.send("isready");
        }
        if (line === "readyok" || line.startsWith("readyok")) {
          finish();
        }
      };

      this.worker.onerror = (err) => {
        finish(new Error(err.message || "Stockfish worker error"));
      };

      // Some builds buffer until first command
      this.send("uci");
    });

    return this.starting;
  }

  private normalizeMessage(data: unknown): string {
    if (typeof data === "string") return data.trim();
    if (data && typeof data === "object" && "data" in (data as object)) {
      return String((data as { data: unknown }).data).trim();
    }
    return String(data ?? "").trim();
  }

  private send(cmd: string) {
    try {
      this.worker?.postMessage(cmd);
    } catch {
      /* worker dead */
    }
  }

  private handleLine(line: string) {
    if (!this.pending) return;

    if (line.startsWith("info ") && line.includes(" pv ")) {
      const multipvMatch = line.match(/\bmultipv (\d+)/);
      const multipv = multipvMatch ? Number(multipvMatch[1]) : 1;
      const depthMatch = line.match(/\bdepth (\d+)/);
      const depth = depthMatch ? Number(depthMatch[1]) : 0;
      const cpMatch = line.match(/\bscore cp (-?\d+)/);
      const mateMatch = line.match(/\bscore mate (-?\d+)/);
      const pvIdx = line.indexOf(" pv ");
      if (pvIdx < 0) return;
      const pv = line
        .slice(pvIdx + 4)
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      if (!pv[0] || !/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(pv[0])) return;

      let scoreCp = 0;
      if (cpMatch) scoreCp = Number(cpMatch[1]);
      else if (mateMatch) {
        const mate = Number(mateMatch[1]);
        scoreCp = mate > 0 ? 100000 - mate * 100 : -100000 - mate * 100;
      }

      this.pending.lines.set(multipv, {
        moveUci: pv[0],
        scoreCp,
        depth,
        pv,
      });
    }

    if (line.startsWith("bestmove")) {
      const parts = line.split(/\s+/);
      const best = parts[1] && parts[1] !== "(none)" ? parts[1] : undefined;
      this.finishPending(best);
    }
  }

  private finishPending(bestUci?: string) {
    if (!this.pending) return;
    const { resolve, lines, timer } = this.pending;
    clearTimeout(timer);
    this.pending = null;

    const out = Array.from(lines.values());
    if (out.length === 0 && bestUci && bestUci !== "(none)") {
      out.push({ moveUci: bestUci, scoreCp: 0, depth: 0, pv: [bestUci] });
    }
    resolve(out);
  }

  private rejectPending(err: Error) {
    if (!this.pending) return;
    const { reject, timer } = this.pending;
    clearTimeout(timer);
    this.pending = null;
    reject(err);
  }

  /** Serialize all searches so we never drop a pending promise. */
  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.chain.then(fn, fn);
    this.chain = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  private async search(
    fen: string,
    opts: {
      moveTimeMs: number;
      multiPv: number;
      skill?: number;
      chess960?: boolean;
      depthCap?: number;
    }
  ): Promise<EngineLine[]> {
    await this.init();

    return this.enqueue(async () => {
      // Abort any stuck search
      if (this.pending) {
        this.send("stop");
        this.rejectPending(new Error("Search superseded"));
      }

      const hardMs = Math.max(opts.moveTimeMs + 2500, 4000);

      return new Promise<EngineLine[]>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.send("stop");
          // Give engine a brief moment to emit bestmove
          setTimeout(() => {
            if (!this.pending) return;
            const lines = Array.from(this.pending.lines.values());
            if (lines.length > 0) {
              this.finishPending(lines[0].moveUci);
            } else {
              this.rejectPending(new Error("Stockfish search timeout"));
            }
          }, 400);
        }, hardMs);

        this.pending = { resolve, reject, lines: new Map(), timer };

        this.send("ucinewgame");
        this.send(
          `setoption name UCI_Chess960 value ${opts.chess960 ? "true" : "false"}`
        );
        this.send(`setoption name MultiPV value ${Math.max(1, opts.multiPv)}`);
        // Prefer Skill Level only — UCI_LimitStrength can stall some WASM builds
        if (opts.skill !== undefined) {
          this.send(`setoption name Skill Level value ${opts.skill}`);
        }
        this.send("setoption name UCI_LimitStrength value false");

        this.send(`position fen ${fen}`);
        if (opts.depthCap) {
          this.send(`go depth ${opts.depthCap}`);
        } else {
          this.send(`go movetime ${Math.max(100, opts.moveTimeMs)}`);
        }
      });
    });
  }

  async getBestMove(
    fen: string,
    tier: AiTier,
    options?: { chess960?: boolean; legalUcis?: string[] }
  ): Promise<EngineLine> {
    const cfg = difficultyConfig(tier);
    const lines = await this.search(fen, {
      moveTimeMs: cfg.moveTimeMs,
      multiPv: cfg.multiPv,
      skill: cfg.skill,
      chess960: options?.chess960,
      depthCap: cfg.depthCap,
    });
    const shaped = shapeMove(tier, lines, options?.legalUcis ?? []);
    if (!shaped) throw new Error("No legal move from engine");
    return shaped;
  }

  async analyze(
    fen: string,
    options?: { chess960?: boolean; multiPv?: number; moveTimeMs?: number }
  ): Promise<EngineLine[]> {
    const budget = analysisBudget();
    return this.search(fen, {
      moveTimeMs: options?.moveTimeMs ?? budget.moveTimeMs,
      multiPv: options?.multiPv ?? budget.multiPv,
      skill: 20,
      chess960: options?.chess960,
    });
  }

  dispose() {
    this.send("quit");
    try {
      this.worker?.terminate();
    } catch {
      /* ignore */
    }
    this.worker = null;
    this.ready = false;
    this.failed = false;
    this.starting = null;
    if (this.pending) {
      this.rejectPending(new Error("Disposed"));
    }
  }
}

let singleton: StockfishClient | null = null;

export function getStockfish(): StockfishClient {
  if (typeof window === "undefined") {
    throw new Error("Stockfish only available in browser");
  }
  if (!singleton) singleton = new StockfishClient();
  return singleton;
}

export function resetStockfish() {
  singleton?.dispose();
  singleton = null;
}
