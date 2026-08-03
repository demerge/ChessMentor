"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AcademyShell } from "@/components/academy/AcademyShell";
import { LESSONS } from "@/academy/curriculum";
import { useAcademyStore } from "@/store/academyStore";
import { Card, ProgressBar } from "@/components/ui/Card";
import { MOTIF_LABELS } from "@/lib/tutorTypes";

export default function LibraryPage() {
  const [q, setQ] = useState("");
  const [diff, setDiff] = useState<"all" | "1" | "2" | "3" | "4" | "5">("all");
  const progress = useAcademyStore((s) => s.progress);

  const tactics = LESSONS.filter((l) => l.moduleId === "tactics");

  const filtered = useMemo(() => {
    return tactics.filter((l) => {
      if (diff !== "all" && String(l.difficulty) !== diff) return false;
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return (
        l.title.toLowerCase().includes(s) ||
        l.tags.some((t) => t.includes(s)) ||
        l.summary.toLowerCase().includes(s)
      );
    });
  }, [tactics, q, diff]);

  return (
    <AcademyShell
      title="Grandmaster Pattern Library"
      subtitle="Searchable encyclopedia: pattern → examples → difficulty → mastery % → bookmarks via completion."
    >
      <div className="mb-6 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search: fork, pin, mate…"
          className="min-w-[200px] flex-1 border border-ink/20 px-3 py-2 text-[13px] outline-none focus:border-ink"
        />
        <select
          value={diff}
          onChange={(e) => setDiff(e.target.value as typeof diff)}
          className="border border-ink/20 bg-paper px-3 py-2 text-[12px]"
        >
          <option value="all">All difficulty</option>
          <option value="1">Easy</option>
          <option value="2">Medium</option>
          <option value="3">Hard</option>
          <option value="4">Advanced</option>
          <option value="5">Master</option>
        </select>
      </div>

      <p className="mb-4 font-mono text-[11px] text-ink/40">
        {filtered.length} patterns · click to open full mini-course
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((l) => {
          const lp = progress.lessons[l.id];
          const mastery = lp?.mastery ?? 0;
          const next = lp?.nextReviewAt
            ? new Date(lp.nextReviewAt).toLocaleDateString()
            : "—";
          return (
            <Card key={l.id} title={l.title} eyebrow={`★★★★★`.slice(0, l.difficulty)} compact>
              <p className="line-clamp-3 text-[11px] text-ink/60">{l.summary}</p>
              <div className="mt-2">
                <ProgressBar value={mastery} label="Mastery" />
              </div>
              <p className="mt-1 font-mono text-[10px] text-ink/40">
                Next review · {next}
              </p>
              {l.masters?.[0] && (
                <p className="mt-1 text-[11px] text-ink/50">
                  GM link: {l.masters.map((m) => m.name).join(", ")}
                </p>
              )}
              <Link
                href={`/academy/lesson/${l.id}`}
                className="mt-2 inline-block text-[11px] uppercase tracking-wider underline"
              >
                Open · Replay · Quiz
              </Link>
            </Card>
          );
        })}
      </div>

      <Card className="mt-8" eyebrow="Also indexed" title="Positional & endgame tags">
        <p className="text-[12px] text-ink/60">
          Library search currently prioritizes tactical mini-courses. Positional
          and endgame lessons live under their modules and still feed spaced
          repetition + adaptive focus (
          {Object.keys(MOTIF_LABELS).slice(0, 6).join(", ")}…).
        </p>
      </Card>
    </AcademyShell>
  );
}
