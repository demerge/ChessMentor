import { get, set } from "idb-keyval";
import type {
  PatternId,
  SkillId,
  SkillMastery,
  ThemeMastery,
} from "./tutorTypes";
import { MOTIF_LABELS, SKILL_LABELS } from "./tutorTypes";

const PROFILE_KEY = "learner:profile:v1";

export interface LearnerProfile {
  skills: SkillMastery[];
  themes: ThemeMastery[];
  /** Themes that need spaced repetition soon */
  weakThemeQueue: PatternId[];
  gamesPlayed: number;
  lastPlayedAt?: string;
  /** Intentional tutor targets for next games */
  nextLessonFocus: PatternId[];
}

const ALL_THEMES: PatternId[] = [
  "fork",
  "pin",
  "skewer",
  "discovered_attack",
  "deflection",
  "decoy",
  "zwischenzug",
  "clearance",
  "smothered_mate",
  "greek_gift",
  "windmill",
  "back_rank",
  "battery",
  "hanging_piece",
  "mate_threat",
  "isolated_pawn",
  "doubled_pawn",
  "passed_pawn",
  "open_file",
  "development",
];

const ALL_SKILLS: SkillId[] = [
  "opening_principles",
  "tactical_vision",
  "pins",
  "forks",
  "endgames",
  "pawn_structures",
  "king_safety",
  "piece_activity",
  "calculation",
  "back_rank_awareness",
];

function defaultProfile(): LearnerProfile {
  return {
    skills: ALL_SKILLS.map((id) => ({
      id,
      label: SKILL_LABELS[id],
      mastery: 40,
    })),
    themes: ALL_THEMES.map((id) => ({
      id,
      label: MOTIF_LABELS[id],
      unlocked: false,
      level: 1,
      mastery: 0,
      seen: 0,
      success: 0,
    })),
    weakThemeQueue: [],
    gamesPlayed: 0,
    nextLessonFocus: ["fork", "pin", "development"],
  };
}

export async function loadLearnerProfile(): Promise<LearnerProfile> {
  const p = await get<LearnerProfile>(PROFILE_KEY);
  if (!p) return defaultProfile();
  // merge defaults for new fields
  const base = defaultProfile();
  return {
    ...base,
    ...p,
    skills: base.skills.map(
      (s) => p.skills.find((x) => x.id === s.id) ?? s
    ),
    themes: base.themes.map(
      (t) => p.themes.find((x) => x.id === t.id) ?? t
    ),
  };
}

export async function saveLearnerProfile(
  profile: LearnerProfile
): Promise<void> {
  await set(PROFILE_KEY, profile);
}

export function recordThemeEncounter(
  profile: LearnerProfile,
  id: PatternId,
  success: boolean
): LearnerProfile {
  const themes = profile.themes.map((t) => {
    if (t.id !== id) return t;
    const seen = t.seen + 1;
    const suc = t.success + (success ? 1 : 0);
    const mastery = Math.min(
      100,
      Math.round((suc / Math.max(1, seen)) * 100 * 0.7 + t.mastery * 0.3)
    );
    const unlocked = true;
    const level = mastery >= 90 ? 5 : mastery >= 72 ? 4 : mastery >= 50 ? 3 : mastery >= 25 ? 2 : 1;
    return {
      ...t,
      seen,
      success: suc,
      mastery,
      unlocked,
      level,
      lastSeenAt: new Date().toISOString(),
    };
  });

  let weakThemeQueue = [...profile.weakThemeQueue];
  const theme = themes.find((t) => t.id === id)!;
  if (theme.mastery < 70) {
    if (!weakThemeQueue.includes(id)) weakThemeQueue.push(id);
  } else {
    weakThemeQueue = weakThemeQueue.filter((x) => x !== id);
  }

  return { ...profile, themes, weakThemeQueue };
}

export function adjustSkill(
  profile: LearnerProfile,
  id: SkillId,
  delta: number
): LearnerProfile {
  return {
    ...profile,
    skills: profile.skills.map((s) =>
      s.id === id
        ? {
            ...s,
            mastery: Math.max(0, Math.min(100, Math.round(s.mastery + delta))),
          }
        : s
    ),
  };
}

export function pickTutorFocus(profile: LearnerProfile): PatternId[] {
  const weak = [...profile.skills]
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 3);
  const fromSkills: PatternId[] = [];
  for (const s of weak) {
    if (s.id === "forks") fromSkills.push("fork");
    if (s.id === "pins") fromSkills.push("pin");
    if (s.id === "back_rank_awareness") fromSkills.push("back_rank");
    if (s.id === "pawn_structures") fromSkills.push("isolated_pawn", "passed_pawn");
    if (s.id === "king_safety") fromSkills.push("king_safety" as PatternId);
    if (s.id === "opening_principles") fromSkills.push("development");
  }
  const q = [
    ...profile.weakThemeQueue,
    ...fromSkills,
    ...profile.nextLessonFocus,
  ];
  return [...new Set(q)].slice(0, 4) as PatternId[];
}

export function finalizeGameProfile(
  profile: LearnerProfile,
  opts: {
    themesHit: { id: PatternId; success: boolean }[];
    skillDeltas: { id: SkillId; delta: number }[];
  }
): LearnerProfile {
  let p: LearnerProfile = {
    ...profile,
    gamesPlayed: profile.gamesPlayed + 1,
    lastPlayedAt: new Date().toISOString(),
  };
  for (const t of opts.themesHit) {
    p = recordThemeEncounter(p, t.id, t.success);
  }
  for (const s of opts.skillDeltas) {
    p = adjustSkill(p, s.id, s.delta);
  }
  p = { ...p, nextLessonFocus: pickTutorFocus(p) };
  return p;
}
