"use client";

import Link from "next/link";
import { AcademyShell } from "@/components/academy/AcademyShell";
import { MODULES, LESSONS } from "@/academy/curriculum";
import { useAcademyStore, certRankTitle } from "@/store/academyStore";
import { Card, ProgressBar } from "@/components/ui/Card";
import { CERT_RANKS } from "@/academy/certification";

export default function AcademyHubPage() {
  const progress = useAcademyStore((s) => s.progress);
  const due = useAcademyStore((s) => s.dueReviewIds);
  const focus = useAcademyStore((s) => s.adaptiveFocusTags);
  const dueIds = due();
  const focusTags = focus();

  const completed = progress.completedLessonIds.length;
  const total = LESSONS.length;
  const pct = total ? Math.round((completed / total) * 100) : 0;

  return (
    <AcademyShell
      title="Master Class Academy"
      subtitle="Not an encyclopedia — a living curriculum: explanation → demonstration → guided practice → live play → assessment → spaced review. Coached like a grandmaster, not a textbook."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          {/* Pipeline philosophy */}
          <Card eyebrow="Core philosophy" title="How every lesson works">
            <ol className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-ink/70">
              {[
                "Explain",
                "Demonstrate",
                "Guided",
                "Practice",
                "Assess",
                "Spaced review",
              ].map((s, i) => (
                <li key={s} className="flex items-center gap-2">
                  <span className="border border-ink/20 px-2 py-1">{s}</span>
                  {i < 5 && <span className="text-ink/25">↓</span>}
                </li>
              ))}
            </ol>
            <p className="mt-3 text-[12px] leading-relaxed text-ink/60">
              Every tactic and idea is introduced in isolation, shown visually,
              practiced interactively, encountered in play, reviewed after
              mistakes, and revisited until it becomes instinct.
            </p>
          </Card>

          {/* Modules grid */}
          <div>
            <h2 className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-ink/45">
              Curriculum modules
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {MODULES.map((m) => {
                const lessons = LESSONS.filter((l) => l.moduleId === m.id);
                const done = lessons.filter((l) =>
                  progress.completedLessonIds.includes(l.id)
                ).length;
                const href =
                  m.id === "lab"
                    ? "/academy/lab"
                    : m.id === "arena"
                      ? "/academy/arena"
                      : m.id === "patterns"
                        ? "/academy/library"
                        : m.id === "certification"
                          ? "/academy/certification"
                          : `/academy/${m.id}`;
                return (
                  <Link key={m.id} href={href} className="block">
                    <Card
                      eyebrow={`Module ${m.order}`}
                      title={`${m.icon}  ${m.title}`}
                      compact
                      className="h-full transition hover:border-ink/40"
                    >
                      <p className="text-[11px] text-ink/45">{m.subtitle}</p>
                      <p className="mt-1 text-[12px] text-ink/70">
                        {m.description}
                      </p>
                      {lessons.length > 0 && (
                        <div className="mt-2">
                          <ProgressBar
                            value={
                              lessons.length
                                ? Math.round((done / lessons.length) * 100)
                                : 0
                            }
                            label={`${done}/${lessons.length} lessons`}
                          />
                        </div>
                      )}
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="space-y-3">
          <Card eyebrow="You" title="Progress" tone="accent" compact>
            <ProgressBar value={pct} label={`Curriculum ${completed}/${total}`} />
            <p className="mt-2 font-mono text-[11px] text-ink/50">
              Rank · {certRankTitle(progress.certRank)} · {progress.xp} XP
            </p>
            <p className="mt-1 text-[11px] text-ink/45">
              Next rank needs deeper mastery + more completed lessons.
            </p>
          </Card>

          <Card eyebrow="Adaptive engine" title="Focus now" tone="good" compact>
            <p className="mb-2 text-[11px] text-ink/55">
              Based on weak mastery & live misses:
            </p>
            <ul className="space-y-1 text-[12px]">
              {focusTags.length === 0 && (
                <li className="text-ink/40">Complete a lesson to personalize.</li>
              )}
              {focusTags.map((t) => (
                <li key={t} className="font-mono text-ink">
                  → {t}
                </li>
              ))}
            </ul>
            <Link
              href="/play/standard?tier=club&detail=detailed&color=white"
              className="mt-3 block border border-ink bg-ink py-2 text-center text-[11px] uppercase tracking-wider text-paper"
            >
              Live gameplay (tutor focus)
            </Link>
          </Card>

          <Card eyebrow="Spaced repetition" title="Due for review" compact>
            {dueIds.length === 0 ? (
              <p className="text-[12px] text-ink/45">
                Nothing due — learn something new.
              </p>
            ) : (
              <ul className="space-y-1.5 text-[12px]">
                {dueIds.slice(0, 6).map((id) => {
                  const title =
                    LESSONS.find((l) => l.id === id)?.title ?? id;
                  return (
                    <li key={id}>
                      <Link
                        href={`/academy/lesson/${id}`}
                        className="text-ink underline-offset-2 hover:underline"
                      >
                        {title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card eyebrow="Path" title="Certification ladder" compact>
            <ul className="space-y-1 text-[11px]">
              {CERT_RANKS.map((r) => (
                <li
                  key={r.id}
                  className={
                    r.id === progress.certRank
                      ? "font-medium text-ink"
                      : "text-ink/35"
                  }
                >
                  {r.id === progress.certRank ? "●" : "○"} {r.title}
                </li>
              ))}
            </ul>
            <Link
              href="/academy/certification"
              className="mt-2 inline-block text-[11px] underline"
            >
              Full path
            </Link>
          </Card>
        </aside>
      </div>
    </AcademyShell>
  );
}
