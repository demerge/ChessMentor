"use client";

import { create } from "zustand";
import { get as idbGet, set as idbSet } from "idb-keyval";
import type { AcademyProgress, CertRank, LessonProgress } from "@/academy/types";
import {
  LESSON_BY_ID,
  LESSON_TAGS,
  LESSONS,
} from "@/academy/curriculum";
import {
  createProgress,
  dueLessons,
  scheduleReview,
  weakestTags,
} from "@/academy/spacedRepetition";
import { computeCertRank } from "@/academy/certification";

const KEY = "academy:progress:v1";

function emptyProgress(): AcademyProgress {
  return {
    lessons: {},
    certRank: "beginner",
    xp: 0,
    completedLessonIds: [],
    challengeStreak: 0,
    adaptiveFocus: ["fork", "pin", "foundation"],
  };
}

interface AcademyState {
  progress: AcademyProgress;
  loaded: boolean;
  activeLessonId: string | null;
  stageIndex: number;
  labFen: string;
  arenaSolved: Record<string, number>;
  lastFeedback: string | null;

  load: () => Promise<void>;
  save: () => Promise<void>;
  startLesson: (lessonId: string) => void;
  setStage: (index: number) => void;
  nextStage: () => void;
  prevStage: () => void;
  completeQuiz: (correct: boolean) => void;
  completePuzzle: (success: boolean) => void;
  finishLesson: (quality: 0 | 1 | 2 | 3) => void;
  getLessonProgress: (id: string) => LessonProgress | undefined;
  dueReviewIds: () => string[];
  adaptiveFocusTags: () => string[];
  setLabFen: (fen: string) => void;
  bumpChallenge: (id: string, n?: number) => void;
  recordLiveMiss: (tag: string) => void;
}

export const useAcademyStore = create<AcademyState>((set, get) => ({
  progress: emptyProgress(),
  loaded: false,
  activeLessonId: null,
  stageIndex: 0,
  labFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  arenaSolved: {},
  lastFeedback: null,

  async load() {
    const saved = (await idbGet(KEY)) as AcademyProgress | undefined | null;
    const progress = saved ?? emptyProgress();
    progress.certRank = computeCertRank(progress);
    progress.adaptiveFocus = weakestTags(
      progress.lessons,
      LESSON_TAGS,
      4
    );
    set({ progress, loaded: true });
  },

  async save() {
    await idbSet(KEY, get().progress);
  },

  startLesson(lessonId) {
    const lesson = LESSON_BY_ID[lessonId];
    if (!lesson) return;
    const progress = { ...get().progress };
    if (!progress.lessons[lessonId]) {
      progress.lessons[lessonId] = createProgress(lessonId);
    }
    set({
      activeLessonId: lessonId,
      stageIndex: progress.lessons[lessonId].stageIndex || 0,
      progress,
      lastFeedback: null,
    });
    void get().save();
  },

  setStage(index) {
    const id = get().activeLessonId;
    if (!id) return;
    const lesson = LESSON_BY_ID[id];
    if (!lesson) return;
    const clamped = Math.max(0, Math.min(lesson.steps.length - 1, index));
    const progress = { ...get().progress };
    const lp = { ...(progress.lessons[id] ?? createProgress(id)) };
    lp.stageIndex = clamped;
    progress.lessons[id] = lp;
    set({ stageIndex: clamped, progress });
    void get().save();
  },

  nextStage() {
    const id = get().activeLessonId;
    if (!id) return;
    const lesson = LESSON_BY_ID[id];
    if (!lesson) return;
    const next = get().stageIndex + 1;
    if (next >= lesson.steps.length) {
      get().finishLesson(2);
      return;
    }
    get().setStage(next);
  },

  prevStage() {
    get().setStage(get().stageIndex - 1);
  },

  completeQuiz(correct) {
    set({
      lastFeedback: correct
        ? "Correct — grandmaster thinking."
        : "Not quite — read the explanation, then continue.",
    });
    if (correct) {
      const progress = { ...get().progress, xp: get().progress.xp + 12 };
      set({ progress });
      void get().save();
    }
  },

  completePuzzle(success) {
    set({
      lastFeedback: success
        ? "Solved — pattern locked in."
        : "Keep calculating — use the hint, then retry.",
    });
    if (success) {
      const progress = { ...get().progress, xp: get().progress.xp + 20 };
      set({ progress });
      void get().save();
    }
  },

  finishLesson(quality) {
    const id = get().activeLessonId;
    if (!id) return;
    const progress = { ...get().progress };
    const prev = progress.lessons[id] ?? createProgress(id);
    const updated = scheduleReview(prev, quality);
    updated.stageIndex = (LESSON_BY_ID[id]?.steps.length ?? 1) - 1;
    updated.completed = true;
    progress.lessons[id] = updated;
    if (!progress.completedLessonIds.includes(id)) {
      progress.completedLessonIds = [...progress.completedLessonIds, id];
      progress.xp += 40;
    }
    progress.certRank = computeCertRank(progress);
    progress.adaptiveFocus = weakestTags(progress.lessons, LESSON_TAGS, 4);
    progress.lastActiveAt = new Date().toISOString();
    set({
      progress,
      lastFeedback: `Lesson complete · mastery ${updated.mastery}% · next review ${new Date(updated.nextReviewAt).toLocaleDateString()}`,
    });
    void get().save();
  },

  getLessonProgress(id) {
    return get().progress.lessons[id];
  },

  dueReviewIds() {
    return dueLessons(get().progress.lessons);
  },

  adaptiveFocusTags() {
    const focus = get().progress.adaptiveFocus;
    if (focus.length) return focus;
    return weakestTags(get().progress.lessons, LESSON_TAGS, 4);
  },

  setLabFen(fen) {
    set({ labFen: fen });
  },

  bumpChallenge(id, n = 1) {
    const arenaSolved = {
      ...get().arenaSolved,
      [id]: (get().arenaSolved[id] ?? 0) + n,
    };
    const progress = {
      ...get().progress,
      xp: get().progress.xp + 15 * n,
      challengeStreak: get().progress.challengeStreak + n,
    };
    set({ arenaSolved, progress });
    void get().save();
  },

  recordLiveMiss(tag) {
    // Adaptive: push related lessons earlier for review
    const related = LESSONS.filter((l) => l.tags.includes(tag)).slice(0, 3);
    const progress = { ...get().progress };
    for (const l of related) {
      const lp = progress.lessons[l.id] ?? createProgress(l.id);
      lp.nextReviewAt = new Date().toISOString();
      lp.mastery = Math.max(0, lp.mastery - 5);
      progress.lessons[l.id] = lp;
    }
    const focus = new Set(progress.adaptiveFocus);
    focus.add(tag);
    progress.adaptiveFocus = [...focus].slice(0, 5);
    set({ progress });
    void get().save();
  },
}));

export function certRankTitle(rank: CertRank): string {
  const map: Record<CertRank, string> = {
    beginner: "Beginner",
    student: "Student",
    apprentice: "Apprentice",
    advanced: "Advanced",
    expert: "Expert",
    master: "Master",
    grandmaster: "Grandmaster",
  };
  return map[rank];
}
