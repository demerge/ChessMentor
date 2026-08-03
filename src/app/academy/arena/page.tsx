"use client";

import { useState } from "react";
import { Chessboard } from "react-chessboard";
import { AcademyShell } from "@/components/academy/AcademyShell";
import { ARENA_CHALLENGES } from "@/academy/curriculum";
import { ChessGame } from "@/engines/rules/game";
import { useAcademyStore } from "@/store/academyStore";
import { Card, ProgressBar } from "@/components/ui/Card";

export default function ArenaPage() {
  const bump = useAcademyStore((s) => s.bumpChallenge);
  const solved = useAcademyStore((s) => s.arenaSolved);
  const streak = useAcademyStore((s) => s.progress.challengeStreak);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [fen, setFen] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const active = ARENA_CHALLENGES.find((c) => c.id === activeId);

  function start(id: string) {
    const ch = ARENA_CHALLENGES.find((c) => c.id === id);
    setActiveId(id);
    setMsg(null);
    if (ch?.puzzles?.[0]) setFen(ch.puzzles[0].fen);
    else setFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  }

  return (
    <AcademyShell
      title="Challenge Arena"
      subtitle="Daily · Weekly · Monthly missions. Knowledge becomes skill under light pressure."
    >
      <p className="mb-4 font-mono text-[11px] text-ink/45">
        Streak points: {streak}
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          {(["daily", "weekly", "monthly"] as const).map((period) => (
            <div key={period}>
              <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink/40">
                {period}
              </h2>
              <div className="space-y-2">
                {ARENA_CHALLENGES.filter((c) => c.period === period).map(
                  (c) => {
                    const n = solved[c.id] ?? 0;
                    const pct = Math.min(100, Math.round((n / c.target) * 100));
                    return (
                      <Card key={c.id} title={c.title} compact eyebrow={c.period}>
                        <p className="text-[12px] text-ink/60">{c.description}</p>
                        <div className="mt-2">
                          <ProgressBar
                            value={pct}
                            label={`${n}/${c.target} · +${c.rewardXp} XP`}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => start(c.id)}
                          className="mt-2 border border-ink bg-ink px-3 py-1.5 text-[11px] uppercase text-paper"
                        >
                          {activeId === c.id ? "Active" : "Start"}
                        </button>
                      </Card>
                    );
                  }
                )}
              </div>
            </div>
          ))}
        </div>

        <div>
          <Card
            eyebrow="Active board"
            title={active?.title ?? "Select a challenge"}
          >
            {!active || !fen ? (
              <p className="text-[13px] text-ink/50">
                Examples: solve forks, recognize pins, convert rook endings, mate
                in N.
              </p>
            ) : (
              <>
                <div className="mx-auto max-w-sm border border-ink/15">
                  <Chessboard
                    options={{
                      id: "arena-board",
                      position: fen,
                      allowDragging: true,
                      onPieceDrop: ({ sourceSquare, targetSquare }) => {
                        if (!targetSquare || !active?.puzzles?.[0]) return false;
                        const g = new ChessGame("standard", fen);
                        if (!g.playFromTo(sourceSquare, targetSquare))
                          return false;
                        const uci = g.historyUci[g.historyUci.length - 1];
                        setFen(g.fen);
                        if (active.puzzles[0].solutionUci.includes(uci)) {
                          bump(active.id, 1);
                          setMsg("Solved! Progress counted.");
                        } else {
                          setMsg("Not yet — keep trying.");
                        }
                        return true;
                      },
                      lightSquareStyle: { backgroundColor: "#F7F5F0" },
                      darkSquareStyle: { backgroundColor: "#8A8680" },
                      boardStyle: { width: "100%" },
                    }}
                  />
                </div>
                {active.puzzles?.[0] && (
                  <p className="mt-3 text-[12px] text-ink/70">
                    {active.puzzles[0].goal}
                  </p>
                )}
                {msg && (
                  <p className="mt-2 font-mono text-[11px] text-good">{msg}</p>
                )}
              </>
            )}
          </Card>
        </div>
      </div>
    </AcademyShell>
  );
}
