"use client";

import { useLearningStore } from "@/store/learningStore";

export function SkillGraph() {
  const profile = useLearningStore((s) => s.profile);
  const summary = useLearningStore((s) => s.lessonSummary);

  const skills = summary?.skillDeltas ?? profile?.skills ?? [];

  return (
    <div className="border border-ink/15 bg-paper">
      <header className="border-b border-ink/10 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/50">
          Adaptive skill graph
        </p>
      </header>
      <ul className="space-y-2 p-3 text-xs">
        {skills.length === 0 && (
          <li className="text-ink/40">Skills update after each game.</li>
        )}
        {skills.map((s) => {
          const mastery =
            "after" in s ? s.after : "mastery" in s ? s.mastery : 0;
          const label = s.label;
          return (
            <li key={"id" in s ? s.id : label}>
              <div className="mb-0.5 flex justify-between">
                <span>{label}</span>
                <span className="font-mono text-ink/50">{mastery}%</span>
              </div>
              <div className="h-1.5 w-full bg-ink/10">
                <div
                  className="h-full bg-ink transition-all"
                  style={{ width: `${mastery}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
