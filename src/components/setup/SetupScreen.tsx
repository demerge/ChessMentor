"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AiTier, GameRecord, PlayColor, TutorDetail, Variant } from "@/lib/types";
import { TIER_META, VARIANT_LABELS } from "@/lib/types";
import { listGames, loadSettings, saveSettings } from "@/lib/persistence";
import { AppNav } from "@/components/shell/AppNav";
import {
  AdaptiveRecommendationCard,
  DailyChallengeCard,
  LearningProgressCard,
  PatternCollectionCard,
  WeeklyReportCard,
} from "@/components/cards/AllCards";
import { useLearningStore } from "@/store/learningStore";

const VARIANTS: { id: Variant; icon: string; blurb: string }[] = [
  { id: "standard", icon: "♟", blurb: "Classical chess" },
  { id: "chess960", icon: "⚄", blurb: "Fischer random start" },
  { id: "atomic", icon: "💥", blurb: "Captures explode" },
  { id: "koth", icon: "⛰", blurb: "King to the hill" },
];

const TIERS: AiTier[] = [
  "beginner",
  "beginnerPlus",
  "club",
  "expert",
  "master",
  "elite",
];

export function SetupScreen() {
  const router = useRouter();
  const [variant, setVariant] = useState<Variant>("standard");
  const [aiTier, setAiTier] = useState<AiTier>("club");
  const [tutorDetail, setTutorDetail] = useState<TutorDetail>("short");
  const [playAs, setPlayAs] = useState<PlayColor>("white");
  const [recent, setRecent] = useState<GameRecord[]>([]);

  useEffect(() => {
    void (async () => {
      await useLearningStore.getState().initProfile();
      const s = await loadSettings();
      if (s.variant) setVariant(s.variant);
      if (s.aiTier) setAiTier(s.aiTier);
      if (s.tutorDetail) setTutorDetail(s.tutorDetail);
      if (s.playAs) setPlayAs(s.playAs);
      const games = await listGames();
      setRecent(games.slice(0, 8));
    })();
  }, []);

  async function start() {
    await saveSettings({ variant, aiTier, tutorDetail, playAs });
    const q = new URLSearchParams({
      tier: aiTier,
      detail: tutorDetail,
      color: playAs,
    });
    router.push(`/play/${variant}?${q.toString()}`);
  }

  function resultLabel(r: GameRecord) {
    if (r.result === "1/2-1/2") return "Draw";
    const won =
      (r.result === "1-0" && r.playerColor === "white") ||
      (r.result === "0-1" && r.playerColor === "black");
    return won ? "Won" : "Lost";
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return iso.slice(0, 10);
    }
  }

  return (
    <div className="min-h-full bg-paper">
      <AppNav subtitle="Lesson lobby · board-first coaching when you play" />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1fr_280px] md:py-12">
      <div>
      <header className="mb-10 border-b border-ink/15 pb-6" id="lesson">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-ink/50">
          Teaching-first chess
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Start a lesson game
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/70">
          The board holds your attention. Cards appear only when they teach —
          context, tactics, candidates, mistakes, and progress.
        </p>
        <Link
          href="/academy"
          className="mt-4 inline-block border border-ink bg-ink px-4 py-2.5 text-[12px] font-medium uppercase tracking-wider text-paper"
        >
          Enter Master Class Academy
        </Link>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink/50">
          Choose your variant
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {VARIANTS.map((v) => {
            const active = variant === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setVariant(v.id)}
                className={`border px-3 py-4 text-left transition ${
                  active
                    ? "border-ink bg-ink text-paper"
                    : "border-ink/20 bg-paper text-ink hover:border-ink/40"
                }`}
              >
                <span className="text-xl" aria-hidden>
                  {v.icon}
                </span>
                <p className="mt-2 text-sm font-medium">
                  {VARIANT_LABELS[v.id]}
                </p>
                <p
                  className={`mt-1 text-xs ${active ? "text-paper/70" : "text-ink/50"}`}
                >
                  {v.blurb}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink/50">
          Opponent strength
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {TIERS.map((t) => {
            const meta = TIER_META[t];
            const active = aiTier === t;
            return (
              <label
                key={t}
                className={`flex cursor-pointer items-center gap-3 border px-3 py-2.5 ${
                  active ? "border-ink bg-ink/[0.04]" : "border-ink/15"
                }`}
              >
                <input
                  type="radio"
                  name="tier"
                  checked={active}
                  onChange={() => setAiTier(t)}
                  className="accent-ink"
                />
                <span className="text-sm">
                  {meta.label}{" "}
                  <span className="font-mono text-xs text-ink/50">
                    ({meta.description})
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="mb-10 grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink/50">
            Tutor detail
          </h2>
          <div className="flex border border-ink/15">
            {(["short", "detailed"] as TutorDetail[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setTutorDetail(d)}
                className={`flex-1 px-3 py-2 text-sm capitalize ${
                  tutorDetail === d
                    ? "bg-ink text-paper"
                    : "bg-paper text-ink hover:bg-ink/5"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink/50">
            Play as
          </h2>
          <div className="flex border border-ink/15">
            {(["white", "black", "random"] as PlayColor[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setPlayAs(c)}
                className={`flex-1 px-3 py-2 text-sm capitalize ${
                  playAs === c
                    ? "bg-ink text-paper"
                    : "bg-paper text-ink hover:bg-ink/5"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={() => void start()}
        className="mb-12 w-full border border-ink bg-ink px-6 py-3.5 text-sm font-medium tracking-wide text-paper transition hover:bg-ink/90 md:w-auto md:min-w-[240px]"
      >
        Start game
      </button>

      <section id="library">
        <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink/50">
          Recent games (local)
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm text-ink/50">No games yet — play one to build history.</p>
        ) : (
          <ul className="divide-y divide-ink/10 border border-ink/15">
            {recent.map((g) => (
              <li
                key={g.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-sm"
              >
                <span>
                  {VARIANT_LABELS[g.variant]} vs {TIER_META[g.aiTier].label} —{" "}
                  {resultLabel(g)} — {formatDate(g.createdAt)}
                </span>
                <a
                  href={`/report/${g.id}`}
                  className="font-mono text-xs uppercase tracking-wider text-ink underline-offset-2 hover:underline"
                >
                  Review
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
      </div>

      <aside className="space-y-2" id="progress">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/40">
          Profile cards
        </p>
        <DailyChallengeCard />
        <LearningProgressCard />
        <PatternCollectionCard />
        <AdaptiveRecommendationCard />
        <WeeklyReportCard />
      </aside>
      </div>
    </div>
  );
}
