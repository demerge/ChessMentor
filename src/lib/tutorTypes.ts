/** Types for the 20-layer contextual learning system */

export type TacticalMotif =
  | "fork"
  | "pin"
  | "skewer"
  | "discovered_attack"
  | "double_check"
  | "deflection"
  | "decoy"
  | "zwischenzug"
  | "clearance"
  | "smothered_mate"
  | "greek_gift"
  | "windmill"
  | "back_rank"
  | "battery"
  | "overload"
  | "hanging_piece"
  | "mate_threat";

export type StructuralTheme =
  | "isolated_pawn"
  | "doubled_pawn"
  | "passed_pawn"
  | "open_file"
  | "weak_square"
  | "bishop_pair"
  | "space_advantage"
  | "king_safety"
  | "piece_activity"
  | "development";

export type PatternId = TacticalMotif | StructuralTheme;

export type SkillId =
  | "opening_principles"
  | "tactical_vision"
  | "pins"
  | "forks"
  | "endgames"
  | "pawn_structures"
  | "king_safety"
  | "piece_activity"
  | "calculation"
  | "back_rank_awareness";

export type InterruptLevel = "none" | "minor" | "major" | "forced_mate";

export type VisionMode = "off" | "attacked" | "undefended" | "weak";

export type HintLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type CoachExplainMode = "why_good" | "like_10" | "show_arrows";

export interface PatternHit {
  id: PatternId;
  label: string;
  squares: string[];
  arrows?: { from: string; to: string; color?: string }[];
  description: string;
  available: boolean;
}

export interface EvalFactor {
  label: string;
  delta: number; // positive = good for side that just moved
  sign: "+" | "−";
}

export interface InterruptPayload {
  level: InterruptLevel;
  title: string;
  message: string;
  emotional: string;
  cpLoss: number;
  bestMoveSan?: string;
  bestMoveUci?: string;
  allowsMateIn?: number;
}

export interface ProgressiveHint {
  level: HintLevel;
  text: string;
  squares?: string[];
  arrows?: { from: string; to: string }[];
  revealUci?: string;
}

export interface LearningEvent {
  ply: number;
  moveNumber: number;
  san: string;
  themes: string[];
  principle?: string;
  thinkMs?: number;
  classification?: string;
}

export interface ThemeMastery {
  id: PatternId;
  label: string;
  unlocked: boolean;
  level: number; // 1–5
  mastery: number; // 0–100
  seen: number;
  success: number;
  lastSeenAt?: string;
}

export interface SkillMastery {
  id: SkillId;
  label: string;
  mastery: number;
}

export interface ThinkSample {
  ply: number;
  ms: number;
  classification?: string;
  note?: string;
}

export interface PrincipleAlert {
  id: string;
  title: string;
  principle: string;
  context: string;
}

export interface PredictionQuiz {
  active: boolean;
  options: { uci: string; san: string }[];
  correctUci: string;
  correctSan: string;
  reason: string;
  playerChoice?: string;
  resolved?: boolean;
  correct?: boolean;
  feedback?: string;
}

export interface TacticAnimation {
  active: boolean;
  motif: PatternId;
  label: string;
  description: string;
  arrows: { from: string; to: string; color: string }[];
  flashSquares: string[];
}

export interface GuidedChecklist {
  kingExposed: boolean;
  items: { id: string; label: string; checked: boolean; hint?: string }[];
  dismissed: boolean;
}

export interface HoverInsight {
  square: string;
  piece: string;
  roles: string[];
  controls: string[];
  leavingWarnings: string[];
}

export interface EvalExplanation {
  before: number;
  after: number;
  forMover: number;
  factors: EvalFactor[];
  summary: string;
}

export interface GameLessonSummary {
  achievements: string[];
  needsWork: string[];
  recommendedLesson: string;
  skillDeltas: { id: SkillId; label: string; before: number; after: number }[];
  timeline: LearningEvent[];
}

export const TACTICAL_RADAR_ORDER: {
  id: TacticalMotif;
  label: string;
  icon: string;
}[] = [
  { id: "pin", label: "Pin", icon: "⚔" },
  { id: "fork", label: "Fork", icon: "⚔" },
  { id: "skewer", label: "Skewer", icon: "⚔" },
  { id: "discovered_attack", label: "Discovered attack", icon: "⚔" },
  { id: "deflection", label: "Deflection", icon: "⚔" },
  { id: "decoy", label: "Decoy", icon: "⚔" },
  { id: "zwischenzug", label: "Zwischenzug", icon: "⚔" },
  { id: "clearance", label: "Clearance", icon: "⚔" },
  { id: "smothered_mate", label: "Smothered mate", icon: "⚔" },
  { id: "greek_gift", label: "Greek Gift", icon: "⚔" },
  { id: "windmill", label: "Windmill", icon: "⚔" },
  { id: "back_rank", label: "Back rank", icon: "⚔" },
  { id: "battery", label: "Battery", icon: "⚔" },
  { id: "hanging_piece", label: "Hanging piece", icon: "⚔" },
  { id: "mate_threat", label: "Mate threat", icon: "⚔" },
];

export const SKILL_LABELS: Record<SkillId, string> = {
  opening_principles: "Opening Principles",
  tactical_vision: "Tactical Vision",
  pins: "Pins",
  forks: "Forks",
  endgames: "Endgames",
  pawn_structures: "Pawn Structures",
  king_safety: "King Safety",
  piece_activity: "Piece Activity",
  calculation: "Calculation",
  back_rank_awareness: "Back-Rank Awareness",
};

export const MOTIF_LABELS: Record<PatternId, string> = {
  fork: "Fork",
  pin: "Pin",
  skewer: "Skewer",
  discovered_attack: "Discovered attack",
  double_check: "Double check",
  deflection: "Deflection",
  decoy: "Decoy",
  zwischenzug: "Zwischenzug",
  clearance: "Clearance",
  smothered_mate: "Smothered mate",
  greek_gift: "Greek Gift",
  windmill: "Windmill",
  back_rank: "Weak back rank",
  battery: "Battery",
  overload: "Overloaded piece",
  hanging_piece: "Hanging piece",
  mate_threat: "Mate threat",
  isolated_pawn: "Isolated pawn",
  doubled_pawn: "Doubled pawn",
  passed_pawn: "Passed pawn",
  open_file: "Open file",
  weak_square: "Weak square",
  bishop_pair: "Bishop pair",
  space_advantage: "Space",
  king_safety: "King safety",
  piece_activity: "Piece activity",
  development: "Development",
};
