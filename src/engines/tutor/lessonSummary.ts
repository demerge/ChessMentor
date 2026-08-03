import type { MoveAnnotation } from "@/lib/types";
import type {
  GameLessonSummary,
  LearningEvent,
  SkillId,
  ThinkSample,
} from "@/lib/tutorTypes";
import { SKILL_LABELS } from "@/lib/tutorTypes";
import type { LearnerProfile } from "@/lib/learnerProfile";

export function buildLessonSummary(opts: {
  annotations: MoveAnnotation[];
  timeline: LearningEvent[];
  thinkSamples: ThinkSample[];
  profileBefore: LearnerProfile;
  profileAfter: LearnerProfile;
  playerColor: "white" | "black";
}): GameLessonSummary {
  const playerPlies = opts.annotations.filter((a) =>
    opts.playerColor === "white" ? a.ply % 2 === 1 : a.ply % 2 === 0
  );

  const achievements: string[] = [];
  const needsWork: string[] = [];

  const forks = opts.timeline.filter((t) => t.themes.includes("Fork")).length;
  const pins = opts.timeline.filter((t) => t.themes.includes("Pin")).length;
  const best = playerPlies.filter((a) =>
    ["best", "brilliant", "good"].includes(a.classification)
  ).length;
  const bad = playerPlies.filter((a) =>
    ["mistake", "blunder"].includes(a.classification)
  ).length;

  if (forks > 0) achievements.push(`Worked with ${forks} fork pattern(s)`);
  if (pins > 0) achievements.push(`Encountered ${pins} pin pattern(s)`);
  if (best >= 3) achievements.push(`Played ${best} strong moves (good/best/brilliant)`);
  if (
    opts.timeline.some((t) =>
      t.themes.some((x) => x.toLowerCase().includes("back"))
    )
  ) {
    achievements.push("Paid attention to back-rank themes");
  }
  if (
    opts.timeline.some((t) =>
      t.themes.some((x) => x.toLowerCase().includes("rook") || x === "Open file")
    )
  ) {
    achievements.push("Improved rook / open-file awareness");
  }

  if (bad >= 2) needsWork.push("Calculation under pressure");
  if (
    opts.thinkSamples.some(
      (t) =>
        t.ms < 5000 &&
        t.classification &&
        ["mistake", "blunder"].includes(t.classification)
    )
  ) {
    needsWork.push("Slowing down before forcing moves");
  }
  if (playerPlies.some((a) => a.cpLoss >= 100)) {
    needsWork.push("Candidate move generation");
  }
  const undevelopedThemes = opts.timeline.filter((t) =>
    t.themes.includes("Development")
  ).length;
  if (undevelopedThemes >= 2) needsWork.push("Opening development discipline");
  if (needsWork.length === 0) needsWork.push("Piece coordination in quiet positions");

  const weakest = [...opts.profileAfter.skills].sort(
    (a, b) => a.mastery - b.mastery
  )[0];
  const recommendedLesson =
    weakest?.id === "forks"
      ? "Forks & double attacks"
      : weakest?.id === "pins"
        ? "Pins and skewers"
        : weakest?.id === "endgames"
          ? "King and pawn endgames"
          : weakest?.id === "pawn_structures"
            ? "Pawn structures"
            : weakest?.id === "back_rank_awareness"
              ? "Back-rank safety"
              : "Pins and Skewers";

  if (achievements.length === 0) {
    achievements.push("Finished a full coached game");
  }

  const skillDeltas = opts.profileAfter.skills.map((s) => {
    const before =
      opts.profileBefore.skills.find((x) => x.id === s.id)?.mastery ?? s.mastery;
    return {
      id: s.id as SkillId,
      label: SKILL_LABELS[s.id as SkillId] ?? s.label,
      before,
      after: s.mastery,
    };
  });

  return {
    achievements: achievements.slice(0, 6),
    needsWork: needsWork.slice(0, 5),
    recommendedLesson,
    skillDeltas,
    timeline: opts.timeline,
  };
}
