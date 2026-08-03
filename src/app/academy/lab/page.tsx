"use client";

import { useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";
import { AcademyShell } from "@/components/academy/AcademyShell";
import { ChessGame } from "@/engines/rules/game";
import { detectPatterns, tacticalRadar } from "@/engines/tutor/patterns";
import { useAcademyStore } from "@/store/academyStore";
import { Card } from "@/components/ui/Card";
import { getPositionContext } from "@/engines/tutor/positionContext";

export default function LabPage() {
  const labFen = useAcademyStore((s) => s.labFen);
  const setLabFen = useAcademyStore((s) => s.setLabFen);
  const [filter, setFilter] = useState<"all" | "fork" | "pin">("all");
  const [coach, setCoach] = useState("Ask: show every tactic, best move, explain…");

  const game = useMemo(() => {
    try {
      return new ChessGame("standard", labFen);
    } catch {
      return new ChessGame("standard");
    }
  }, [labFen]);

  const patterns = detectPatterns(game).filter((p) => p.available);
  const radar = tacticalRadar(game);
  const ctx = getPositionContext(game);

  function ask(cmd: string) {
    if (cmd.includes("fork")) {
      setFilter("fork");
      setCoach(
        patterns.find((p) => p.id === "fork")?.description ??
          "No fork geometry detected — try rearranging pieces."
      );
    } else if (cmd.includes("tactic") || cmd.includes("every")) {
      setFilter("all");
      setCoach(
        patterns.length
          ? `Live tactics: ${patterns.map((p) => p.label).join(", ")}.`
          : "No major motifs — position looks quiet."
      );
    } else if (cmd.includes("best")) {
      const m = game.legalMoves()[0];
      setCoach(
        m
          ? `A sample legal candidate is ${m.san} (${m.uci}). Use Play mode with the engine for full strength best moves.`
          : "No legal moves."
      );
    } else if (cmd.includes("explain")) {
      setCoach(
        `${ctx.phase} · ${ctx.openingName}. Material ${ctx.material}. ${ctx.kingSafety}. Initiative: ${ctx.initiative}.`
      );
    } else {
      setCoach("Commands: show every tactic · show only forks · find best move · explain.");
    }
  }

  return (
    <AcademyShell
      title="Interactive Laboratory"
      subtitle="Sandbox: move freely, flip, reset, generate ideas, ask the coach about this exact board."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div>
          <div className="border border-ink/15">
            <Chessboard
              options={{
                id: "lab-board",
                position: labFen,
                allowDragging: true,
                onPieceDrop: ({ sourceSquare, targetSquare }) => {
                  if (!targetSquare) return false;
                  const g = new ChessGame("standard", labFen);
                  if (!g.playFromTo(sourceSquare, targetSquare)) return false;
                  setLabFen(g.fen);
                  return true;
                },
                lightSquareStyle: { backgroundColor: "#F7F5F0" },
                darkSquareStyle: { backgroundColor: "#8A8680" },
                boardStyle: { width: "100%" },
              }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setLabFen(
                  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                )
              }
              className="border border-ink/20 px-3 py-1.5 text-[11px] uppercase"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => {
                // random-ish from puzzle bank via simple shuffle of legal midgame-ish FEN
                const fens = [
                  "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5",
                  "rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
                  "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1",
                ];
                setLabFen(fens[Math.floor(Math.random() * fens.length)]);
              }}
              className="border border-ink/20 px-3 py-1.5 text-[11px] uppercase"
            >
              Random position
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <Card eyebrow="AI lab coach" title="Commands">
            <div className="mb-3 flex flex-wrap gap-1">
              {[
                "Show every tactic",
                "Show only forks",
                "Find best move",
                "Explain",
              ].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => ask(c.toLowerCase())}
                  className="border border-ink/15 px-2 py-1 text-[11px] hover:border-ink/40"
                >
                  {c}
                </button>
              ))}
            </div>
            <p className="text-[13px] leading-relaxed text-ink/80">{coach}</p>
          </Card>

          <Card eyebrow="Detection" title="Tactics on this board" compact>
            <ul className="space-y-1 text-[12px]">
              {radar
                .filter((r) => {
                  if (!r.available) return false;
                  if (filter === "fork") return r.id === "fork";
                  if (filter === "pin") return r.id === "pin";
                  return true;
                })
                .map((r) => (
                  <li key={r.id}>
                    <span className="text-good">✓</span> {r.label} —{" "}
                    <span className="text-ink/60">{r.description}</span>
                  </li>
                ))}
              {patterns.length === 0 && (
                <li className="text-ink/40">No active motifs.</li>
              )}
            </ul>
          </Card>

          <Card eyebrow="Context" title="Position story" compact>
            <p className="text-[12px]">
              {ctx.phase} · {ctx.openingName} · {ctx.material} · {ctx.kingSafety}
            </p>
          </Card>
        </div>
      </div>
    </AcademyShell>
  );
}
