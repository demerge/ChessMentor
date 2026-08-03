"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AcademyShell } from "@/components/academy/AcademyShell";
import { lessonsForModule, moduleById } from "@/academy/curriculum";
import { useAcademyStore } from "@/store/academyStore";
import { Card, ProgressBar } from "@/components/ui/Card";

export default function AcademyModulePage() {
  const params = useParams();
  const moduleId = String(params.moduleId ?? "");
  const mod = moduleById(moduleId);
  const progress = useAcademyStore((s) => s.progress);
  const startLesson = useAcademyStore((s) => s.startLesson);

  if (!mod) {
    return (
      <AcademyShell title="Module not found">
        <Link href="/academy" className="underline">
          Back to hub
        </Link>
      </AcademyShell>
    );
  }

  const lessons = lessonsForModule(moduleId);

  return (
    <AcademyShell title={`${mod.icon} ${mod.title}`} subtitle={mod.description}>
      <div className="mb-6">
        <Link
          href="/academy"
          className="font-mono text-[11px] text-ink/45 hover:text-ink"
        >
          ← Academy hub
        </Link>
      </div>

      {lessons.length === 0 ? (
        <Card title="Special module">
          <p className="text-[13px] text-ink/70">
            This module lives in its own workspace (Library, Lab, Arena, or
            Certification).
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {lessons.map((l) => {
            const lp = progress.lessons[l.id];
            const done = progress.completedLessonIds.includes(l.id);
            return (
              <Card
                key={l.id}
                eyebrow={l.kind}
                title={l.title}
                compact
                action={
                  done ? (
                    <span className="font-mono text-[10px] text-good">Done</span>
                  ) : null
                }
              >
                <p className="text-[12px] text-ink/60">{l.summary}</p>
                <div className="mt-2 flex flex-wrap gap-2 font-mono text-[10px] text-ink/40">
                  <span>~{l.estimatedMinutes}m</span>
                  <span>{"★".repeat(l.difficulty)}</span>
                  {l.masteryLoop && (
                    <span className="text-good">
                      {l.masteryLoop.join(" · ")}
                    </span>
                  )}
                </div>
                {lp && (
                  <div className="mt-2">
                    <ProgressBar value={lp.mastery} label="Mastery" />
                  </div>
                )}
                <Link
                  href={`/academy/lesson/${l.id}`}
                  onClick={() => startLesson(l.id)}
                  className="mt-3 inline-block border border-ink bg-ink px-3 py-1.5 text-[11px] uppercase tracking-wider text-paper"
                >
                  {done ? "Review lesson" : "Start lesson"}
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </AcademyShell>
  );
}
