"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { GameRecord } from "@/lib/types";
import { TIER_META, VARIANT_LABELS, CLASSIFICATION_META } from "@/lib/types";
import { getGame } from "@/lib/persistence";
import { ClassificationIcon } from "@/components/tutor/ClassificationIcon";
import { useLearningStore } from "@/store/learningStore";
import { SkillGraph } from "@/components/tutor/SkillGraph";
import { ThemeLibrary } from "@/components/tutor/ThemeLibrary";

export function ReportScreen({ gameId }: { gameId: string }) {
  const [record, setRecord] = useState<GameRecord | null | undefined>(undefined);
  const lessonSummary = useLearningStore((s) => s.lessonSummary);

  useEffect(() => {
    void getGame(gameId).then(setRecord);
    void useLearningStore.getState().initProfile();
  }, [gameId]);

  if (record === undefined) {
    return (
      <div className="p-10 font-mono text-sm text-ink/50">Loading report…</div>
    );
  }

  if (!record) {
    return (
      <div className="mx-auto max-w-lg p-10">
        <p className="text-ink">Game not found in local storage.</p>
        <Link href="/" className="mt-4 inline-block text-sm underline">
          Home
        </Link>
      </div>
    );
  }

  const youAcc =
    record.playerColor === "white"
      ? record.accuracy.white
      : record.accuracy.black;
  const aiAcc =
    record.playerColor === "white"
      ? record.accuracy.black
      : record.accuracy.white;

  const won =
    (record.result === "1-0" && record.playerColor === "white") ||
    (record.result === "0-1" && record.playerColor === "black");
  const draw = record.result === "1/2-1/2";

  const chartData = record.annotations.map((a, i) => {
    // eval from white perspective for the graph
    const whiteEval = a.ply % 2 === 1 ? a.evalAfter : -a.evalAfter;
    return {
      ply: i + 1,
      eval: Math.max(-10, Math.min(10, whiteEval / 100)),
      san: a.san,
    };
  });

  const moments = record.annotations.filter((a) =>
    ["inaccuracy", "mistake", "blunder"].includes(a.classification)
  );

  function exportPgn() {
    if (!record) return;
    const blob = new Blob([record.pgn], { type: "application/x-chess-pgn" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chessmentor-${record.id}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-ink/15 pb-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/50">
            Game report
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">
            {VARIANT_LABELS[record.variant]} vs{" "}
            {TIER_META[record.aiTier].label}
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportPgn}
            className="border border-ink bg-ink px-3 py-2 text-xs uppercase tracking-wider text-paper"
          >
            Export PGN
          </button>
          <Link
            href="/"
            className="border border-ink/20 px-3 py-2 text-xs uppercase tracking-wider hover:bg-ink/5"
          >
            Home
          </Link>
        </div>
      </header>

      <section className="mb-8 space-y-2 text-sm">
        <p>
          <strong>Result:</strong>{" "}
          {draw ? "Draw" : won ? "You won" : "You lost"}
          {record.endReason ? ` (${record.endReason})` : ""} — {record.result}
        </p>
        <p className="font-mono">
          Accuracy · You: {youAcc}% · AI ({TIER_META[record.aiTier].description}
          ): {aiAcc}%
        </p>
      </section>

      {/* 18 — Interactive lesson summary */}
      {lessonSummary && (
        <section className="mb-10 grid gap-4 border border-ink/15 p-4 sm:grid-cols-2">
          <div>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-good">
              Today&apos;s achievements
            </h2>
            <ul className="mt-2 space-y-1 text-sm">
              {lessonSummary.achievements.map((a) => (
                <li key={a}>✓ {a}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-signal">
              Needs work
            </h2>
            <ul className="mt-2 space-y-1 text-sm">
              {lessonSummary.needsWork.map((a) => (
                <li key={a}>• {a}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm">
              Recommended next lesson:{" "}
              <strong>{lessonSummary.recommendedLesson}</strong>
            </p>
          </div>
        </section>
      )}

      <section className="mb-10 grid gap-4 md:grid-cols-2">
        <SkillGraph />
        <ThemeLibrary />
      </section>

      {chartData.length > 0 && (
        <section className="mb-10 border border-ink/15 p-4">
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink/50">
            Evaluation over time
          </h2>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="ply" tick={{ fontSize: 10 }} stroke="#8A8680" />
                <YAxis
                  domain={[-5, 5]}
                  tick={{ fontSize: 10 }}
                  stroke="#8A8680"
                />
                <Tooltip
                  contentStyle={{
                    background: "#F7F5F0",
                    border: "1px solid #1A1A1A33",
                    borderRadius: 0,
                    fontSize: 12,
                  }}
                />
                <ReferenceLine y={0} stroke="#8A8680" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="eval"
                  stroke="#1A1A1A"
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="mb-10">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink/50">
          Moments to review
        </h2>
        {moments.length === 0 ? (
          <p className="text-sm text-ink/60">
            No major inaccuracies — clean game.
          </p>
        ) : (
          <ul className="space-y-3">
            {moments.map((m) => (
              <li key={m.ply} className="border border-ink/15 p-3 text-sm">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span>
                    Move {Math.ceil(m.ply / 2)} · {m.san}
                  </span>
                  <ClassificationIcon classification={m.classification} showLabel />
                  <span className="text-ink/40">
                    {CLASSIFICATION_META[m.classification].icon}
                  </span>
                </div>
                <p className="mt-2 leading-relaxed text-ink/80">
                  {m.outcomeNote}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink/50">
          Themes this game
        </h2>
        <ul className="flex flex-wrap gap-2">
          {record.themes.map((t) => (
            <li
              key={t}
              className="border border-ink/20 px-3 py-1 text-sm text-ink"
            >
              {t}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink/50">
          Full move list
        </h2>
        <ol className="space-y-1 font-mono text-sm">
          {record.annotations.map((a) => (
            <li key={a.ply} className="flex gap-2 border-b border-ink/5 py-1">
              <span className="w-8 text-ink/40">{a.ply}.</span>
              <span className="w-16">{a.san}</span>
              <ClassificationIcon classification={a.classification} />
              <span className="flex-1 truncate text-ink/50">{a.outcomeNote}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
