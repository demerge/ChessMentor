"use client";

import { useLearningStore } from "@/store/learningStore";

export function ThemeLibrary() {
  const profile = useLearningStore((s) => s.profile);
  const tutorFocus = useLearningStore((s) => s.tutorFocus);

  if (!profile) {
    return (
      <div className="border border-ink/15 p-3 text-xs text-ink/40">
        Theme library unlocks as you play…
      </div>
    );
  }

  const unlocked = profile.themes.filter((t) => t.unlocked);
  const locked = profile.themes.filter((t) => !t.unlocked).slice(0, 6);

  return (
    <div className="border border-ink/15 bg-paper">
      <header className="border-b border-ink/10 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/50">
          Theme library
        </p>
        {tutorFocus.length > 0 && (
          <p className="mt-1 text-[10px] text-ink/40">
            Tutor focus: {tutorFocus.join(", ")}
          </p>
        )}
      </header>
      <ul className="max-h-40 space-y-1 overflow-y-auto p-2 text-xs">
        {unlocked.length === 0 && (
          <li className="text-ink/40">No themes unlocked yet — play a game.</li>
        )}
        {unlocked.map((t) => (
          <li
            key={t.id}
            className="flex items-center justify-between border-b border-ink/5 py-1"
          >
            <span>
              ✓ {t.label}{" "}
              <span className="text-ink/40">Lv{t.level}</span>
            </span>
            <span className="font-mono text-ink/50">{t.mastery}%</span>
          </li>
        ))}
        {locked.map((t) => (
          <li key={t.id} className="text-ink/25">
            ○ {t.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
