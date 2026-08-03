import type { LessonProgress } from "./types";

/** Simplified SM-2 for academy lessons */

export function createProgress(lessonId: string): LessonProgress {
  const now = new Date().toISOString();
  return {
    lessonId,
    stageIndex: 0,
    completed: false,
    mastery: 0,
    lastScore: 0,
    attempts: 0,
    lastSeenAt: now,
    nextReviewAt: now,
    ease: 2.5,
    intervalDays: 0,
  };
}

/**
 * quality: 0 fail, 1 hard, 2 good, 3 easy
 */
export function scheduleReview(
  prev: LessonProgress,
  quality: 0 | 1 | 2 | 3
): LessonProgress {
  let { ease, intervalDays, mastery } = prev;
  const attempts = prev.attempts + 1;

  if (quality === 0) {
    intervalDays = 0;
    ease = Math.max(1.3, ease - 0.2);
    mastery = Math.max(0, mastery - 15);
  } else {
    if (intervalDays <= 0) intervalDays = 1;
    else if (intervalDays === 1) intervalDays = quality >= 2 ? 3 : 1;
    else intervalDays = Math.round(intervalDays * ease);

    ease = Math.min(
      3.0,
      Math.max(1.3, ease + (quality === 3 ? 0.15 : quality === 2 ? 0.05 : -0.1))
    );
    mastery = Math.min(
      100,
      mastery + (quality === 3 ? 18 : quality === 2 ? 12 : 6)
    );
  }

  const next = new Date();
  next.setDate(next.getDate() + Math.max(0, intervalDays));

  return {
    ...prev,
    attempts,
    ease,
    intervalDays,
    mastery,
    lastScore: quality * 33,
    lastSeenAt: new Date().toISOString(),
    nextReviewAt: next.toISOString(),
    completed: mastery >= 70 || prev.completed,
  };
}

export function dueLessons(
  progress: Record<string, LessonProgress>,
  now = Date.now()
): string[] {
  return Object.values(progress)
    .filter((p) => new Date(p.nextReviewAt).getTime() <= now)
    .sort(
      (a, b) =>
        new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime()
    )
    .map((p) => p.lessonId);
}

export function weakestTags(
  progress: Record<string, LessonProgress>,
  lessonTags: Record<string, string[]>,
  limit = 3
): string[] {
  const scores = new Map<string, { sum: number; n: number }>();
  for (const [id, p] of Object.entries(progress)) {
    const tags = lessonTags[id] ?? [];
    for (const t of tags) {
      const cur = scores.get(t) ?? { sum: 0, n: 0 };
      cur.sum += p.mastery;
      cur.n += 1;
      scores.set(t, cur);
    }
  }
  return [...scores.entries()]
    .map(([tag, { sum, n }]) => ({ tag, avg: sum / n }))
    .sort((a, b) => a.avg - b.avg)
    .slice(0, limit)
    .map((x) => x.tag);
}
