/** Master Class Academy — curriculum & progress types */

export type AcademyModuleId =
  | "foundation"
  | "tactics"
  | "positional"
  | "openings"
  | "middlegame"
  | "endgame"
  | "psychology"
  | "patterns"
  | "lab"
  | "arena"
  | "certification";

export type LessonStageId =
  | "explain"
  | "demonstrate"
  | "guided"
  | "practice"
  | "assess"
  | "review";

export type LessonKind =
  | "thinking"
  | "tactic"
  | "positional"
  | "opening"
  | "middlegame"
  | "endgame"
  | "psychology"
  | "pattern"
  | "challenge";

export type CertRank =
  | "beginner"
  | "student"
  | "apprentice"
  | "advanced"
  | "expert"
  | "master"
  | "grandmaster";

export interface AcademyModule {
  id: AcademyModuleId;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  order: number;
  lessonIds: string[];
}

export interface LessonStep {
  stage: LessonStageId;
  title: string;
  body: string;
  /** Optional board FEN for demonstration */
  fen?: string;
  /** Highlight squares */
  highlights?: string[];
  arrows?: { from: string; to: string; color?: string }[];
  /** Multiple choice or free for assess */
  quiz?: {
    prompt: string;
    choices: string[];
    correctIndex: number;
    explanation: string;
  };
  /** Puzzle: find best move */
  puzzle?: {
    fen: string;
    /** Side to move that user plays */
    playerColor: "white" | "black";
    solutionUci: string[];
    hint: string;
    goal: string;
  };
}

export interface AcademyLesson {
  id: string;
  moduleId: AcademyModuleId;
  kind: LessonKind;
  title: string;
  summary: string;
  /** Find → Create → Prevent for tactics */
  masteryLoop?: ["find", "create", "prevent"];
  tags: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  estimatedMinutes: number;
  steps: LessonStep[];
  /** Famous game references */
  masters?: { name: string; note: string }[];
  relatedLessonIds?: string[];
}

export interface LessonProgress {
  lessonId: string;
  stageIndex: number;
  completed: boolean;
  mastery: number; // 0–100
  lastScore: number;
  attempts: number;
  lastSeenAt: string;
  nextReviewAt: string;
  ease: number;
  intervalDays: number;
}

export interface AcademyProgress {
  lessons: Record<string, LessonProgress>;
  certRank: CertRank;
  xp: number;
  completedLessonIds: string[];
  challengeStreak: number;
  adaptiveFocus: string[];
  lastActiveAt?: string;
}

export interface ArenaChallenge {
  id: string;
  title: string;
  description: string;
  period: "daily" | "weekly" | "monthly";
  goalType: "puzzles" | "recognize" | "win_motif" | "endgame" | "mate";
  target: number;
  rewardXp: number;
  lessonTag?: string;
  puzzles?: LessonStep["puzzle"][];
}

export const STAGE_ORDER: LessonStageId[] = [
  "explain",
  "demonstrate",
  "guided",
  "practice",
  "assess",
  "review",
];

export const STAGE_LABELS: Record<LessonStageId, string> = {
  explain: "Explanation",
  demonstrate: "Demonstration",
  guided: "Guided practice",
  practice: "Live practice",
  assess: "Assessment",
  review: "Spaced review",
};
