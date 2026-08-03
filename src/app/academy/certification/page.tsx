"use client";

import { AcademyShell } from "@/components/academy/AcademyShell";
import { CERT_RANKS } from "@/academy/certification";
import { useAcademyStore, certRankTitle } from "@/store/academyStore";
import { LESSONS } from "@/academy/curriculum";
import { Card, ProgressBar } from "@/components/ui/Card";

export default function CertificationPage() {
  const progress = useAcademyStore((s) => s.progress);
  const completed = progress.completedLessonIds.length;
  const values = Object.values(progress.lessons);
  const avg =
    values.length === 0
      ? 0
      : Math.round(
          values.reduce((s, p) => s + p.mastery, 0) / values.length
        );

  return (
    <AcademyShell
      title="Certification path"
      subtitle="Milestones unlock AI personalities, scenarios, puzzle packs, and badges — earned through demonstrated skill, not a quiz alone."
    >
      <Card eyebrow="Current" title={certRankTitle(progress.certRank)} tone="accent">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="font-mono text-[10px] text-ink/40">Lessons complete</p>
            <p className="text-lg font-semibold">
              {completed}/{LESSONS.length}
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] text-ink/40">Avg mastery</p>
            <p className="text-lg font-semibold">{avg}%</p>
          </div>
          <div>
            <p className="font-mono text-[10px] text-ink/40">Academy XP</p>
            <p className="text-lg font-semibold">{progress.xp}</p>
          </div>
        </div>
      </Card>

      <div className="mt-6 space-y-3">
        {CERT_RANKS.map((r, i) => {
          const current = r.id === progress.certRank;
          const reached =
            completed >= r.minLessons && avg >= r.minAvgMastery;
          return (
            <Card
              key={r.id}
              eyebrow={`Rank ${i + 1}`}
              title={r.title}
              tone={current ? "good" : "default"}
              compact
            >
              <p className="text-[12px] text-ink/65">{r.requirement}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <ProgressBar
                  value={Math.min(
                    100,
                    Math.round((completed / Math.max(1, r.minLessons)) * 100)
                  )}
                  label={`Lessons (${r.minLessons}+)`}
                />
                <ProgressBar
                  value={Math.min(100, Math.round((avg / Math.max(1, r.minAvgMastery)) * 100))}
                  label={`Mastery (${r.minAvgMastery}%+)`}
                />
              </div>
              <p className="mt-2 text-[11px] text-ink/50">
                Unlocks: {r.unlocks.join(" · ")}
              </p>
              <p className="mt-1 font-mono text-[10px]">
                {current
                  ? "● Current rank"
                  : reached
                    ? "✓ Requirements met"
                    : "○ Locked"}
              </p>
            </Card>
          );
        })}
      </div>
    </AcademyShell>
  );
}
