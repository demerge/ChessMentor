import type { AcademyProgress, CertRank } from "./types";

export const CERT_RANKS: {
  id: CertRank;
  title: string;
  requirement: string;
  minLessons: number;
  minAvgMastery: number;
  unlocks: string[];
}[] = [
  {
    id: "beginner",
    title: "Beginner",
    requirement: "Basic piece movement & checkmate patterns",
    minLessons: 0,
    minAvgMastery: 0,
    unlocks: ["Friendly AI personality", "Starter puzzles"],
  },
  {
    id: "student",
    title: "Student",
    requirement: "Forks, pins, skewers, simple tactics",
    minLessons: 6,
    minAvgMastery: 45,
    unlocks: ["Attacking AI personality", "Tactics pack I"],
  },
  {
    id: "apprentice",
    title: "Apprentice",
    requirement: "Combinations & opening principles",
    minLessons: 14,
    minAvgMastery: 55,
    unlocks: ["Positional AI", "Opening traps set"],
  },
  {
    id: "advanced",
    title: "Advanced",
    requirement: "Positional play and planning",
    minLessons: 24,
    minAvgMastery: 65,
    unlocks: ["Planning scenarios", "Endgame starter"],
  },
  {
    id: "expert",
    title: "Expert",
    requirement: "Complex calculation and endgames",
    minLessons: 36,
    minAvgMastery: 75,
    unlocks: ["Calculation lab", "Rook endings pack"],
  },
  {
    id: "master",
    title: "Master",
    requirement: "Consistent tactical & strategic understanding",
    minLessons: 50,
    minAvgMastery: 85,
    unlocks: ["Master challenges", "Gold badge"],
  },
  {
    id: "grandmaster",
    title: "Grandmaster",
    requirement: "High mastery across modules + arena performance",
    minLessons: 70,
    minAvgMastery: 92,
    unlocks: ["GM puzzle vault", "Exclusive coach voice"],
  },
];

export function computeCertRank(progress: AcademyProgress): CertRank {
  const completed = progress.completedLessonIds.length;
  const values = Object.values(progress.lessons);
  const avg =
    values.length === 0
      ? 0
      : values.reduce((s, p) => s + p.mastery, 0) / values.length;

  let rank: CertRank = "beginner";
  for (const r of CERT_RANKS) {
    if (completed >= r.minLessons && avg >= r.minAvgMastery) {
      rank = r.id;
    }
  }
  return rank;
}

export function certIndex(rank: CertRank): number {
  return CERT_RANKS.findIndex((r) => r.id === rank);
}
