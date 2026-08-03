"use client";

import { create } from "zustand";

export interface CandidateEntry {
  id: string;
  san: string;
  rating: number;
  isBest: boolean;
}

export interface CoachMessage {
  id: string;
  role: "user" | "coach";
  text: string;
  at: number;
}

export interface AchievementToast {
  id: string;
  title: string;
  detail: string;
}

export interface CriticalMoment {
  ply: number;
  moveNumber: number;
  san: string;
  kind: "missed" | "brilliant" | "lesson";
  label: string;
}

const emptyCandidates = (): CandidateEntry[] => [
  { id: "1", san: "", rating: 3, isBest: false },
  { id: "2", san: "", rating: 3, isBest: false },
  { id: "3", san: "", rating: 3, isBest: false },
];

interface CardState {
  xp: number;
  sessionXp: number;
  candidates: CandidateEntry[];
  candidatesSubmitted: boolean;
  candidateFeedback: string | null;
  reflectionOpen: boolean;
  reflectionChoice: string | null;
  coachMessages: CoachMessage[];
  achievement: AchievementToast | null;
  criticalMoments: CriticalMoment[];
  dailyMission: {
    theme: string;
    progress: number;
    target: number;
    rewardXp: number;
  };
  hintXpCost: number;
  weeklyStats: {
    games: number;
    accuracy: number;
    patterns: number;
    mistakesReduced: number;
    bestImprovement: string;
  };

  addXp: (n: number, reason?: string) => void;
  updateCandidate: (id: string, patch: Partial<CandidateEntry>) => void;
  submitCandidates: (engineBestSan?: string) => void;
  resetCandidates: () => void;
  setReflection: (choice: string | null) => void;
  openReflection: (open: boolean) => void;
  pushCoach: (role: "user" | "coach", text: string) => void;
  showAchievement: (title: string, detail: string) => void;
  clearAchievement: () => void;
  addCriticalMoment: (m: CriticalMoment) => void;
  bumpMission: (theme?: string) => void;
  chargeHintXp: () => boolean;
  resetSessionCards: () => void;
}

export const useCardStore = create<CardState>((set, get) => ({
  xp: 0,
  sessionXp: 0,
  candidates: emptyCandidates(),
  candidatesSubmitted: false,
  candidateFeedback: null,
  reflectionOpen: false,
  reflectionChoice: null,
  coachMessages: [
    {
      id: "welcome",
      role: "coach",
      text: "Ask about this position anytime — I always refer to the live board.",
      at: Date.now(),
    },
  ],
  achievement: null,
  criticalMoments: [],
  dailyMission: {
    theme: "Knight Forks",
    progress: 0,
    target: 3,
    rewardXp: 150,
  },
  hintXpCost: 5,
  weeklyStats: {
    games: 0,
    accuracy: 0,
    patterns: 0,
    mistakesReduced: 0,
    bestImprovement: "King Safety",
  },

  addXp(n, reason) {
    set((s) => ({ xp: s.xp + n, sessionXp: s.sessionXp + n }));
    if (reason && n >= 25) {
      get().showAchievement("XP gained", `+${n} XP · ${reason}`);
    }
  },

  updateCandidate(id, patch) {
    set((s) => ({
      candidates: s.candidates.map((c) =>
        c.id === id ? { ...c, ...patch } : c
      ),
    }));
  },

  submitCandidates(engineBestSan) {
    const filled = get().candidates.filter((c) => c.san.trim());
    if (filled.length === 0) {
      set({ candidateFeedback: "Enter at least one candidate move." });
      return;
    }
    let feedback = `You considered ${filled.length} idea(s). `;
    if (engineBestSan) {
      const hit = filled.some(
        (c) =>
          c.san.replace(/[+#]/g, "").toLowerCase() ===
          engineBestSan.replace(/[+#]/g, "").toLowerCase()
      );
      if (hit) {
        feedback += `You found the engine's top idea (${engineBestSan}). Excellent calculation.`;
        get().addXp(20, "Candidate match");
      } else {
        feedback += `Engine prefers ${engineBestSan}. Compare why your candidates score lower.`;
        get().addXp(8, "Candidate practice");
      }
    } else {
      feedback += "Submit builds the habit of generating options before moving.";
      get().addXp(5);
    }
    set({ candidatesSubmitted: true, candidateFeedback: feedback });
  },

  resetCandidates() {
    set({
      candidates: emptyCandidates(),
      candidatesSubmitted: false,
      candidateFeedback: null,
    });
  },

  setReflection(choice) {
    set({ reflectionChoice: choice, reflectionOpen: false });
    if (choice) get().addXp(3, "Reflection");
  },

  openReflection(open) {
    set({ reflectionOpen: open });
  },

  pushCoach(role, text) {
    set((s) => ({
      coachMessages: [
        ...s.coachMessages,
        { id: `${Date.now()}-${role}`, role, text, at: Date.now() },
      ].slice(-40),
    }));
  },

  showAchievement(title, detail) {
    const id = String(Date.now());
    set({ achievement: { id, title, detail } });
    setTimeout(() => {
      if (get().achievement?.id === id) set({ achievement: null });
    }, 4500);
  },

  clearAchievement() {
    set({ achievement: null });
  },

  addCriticalMoment(m) {
    set((s) => ({
      criticalMoments: [...s.criticalMoments, m].slice(-20),
    }));
  },

  bumpMission(theme) {
    set((s) => {
      const t = theme?.toLowerCase() ?? "";
      const missionTheme = s.dailyMission.theme.toLowerCase();
      if (t && !missionTheme.includes(t) && !t.includes("fork")) return s;
      const progress = Math.min(
        s.dailyMission.target,
        s.dailyMission.progress + 1
      );
      if (
        progress >= s.dailyMission.target &&
        s.dailyMission.progress < s.dailyMission.target
      ) {
        queueMicrotask(() =>
          get().addXp(s.dailyMission.rewardXp, "Daily mission")
        );
      }
      return { dailyMission: { ...s.dailyMission, progress } };
    });
  },

  chargeHintXp() {
    const cost = get().hintXpCost;
    set((s) => ({ xp: Math.max(0, s.xp - cost) }));
    return true;
  },

  resetSessionCards() {
    set({
      sessionXp: 0,
      candidatesSubmitted: false,
      candidateFeedback: null,
      reflectionOpen: false,
      reflectionChoice: null,
      criticalMoments: [],
      candidates: emptyCandidates(),
      coachMessages: [
        {
          id: "welcome",
          role: "coach",
          text: "New game — I'll coach from this board only.",
          at: Date.now(),
        },
      ],
    });
  },
}));
