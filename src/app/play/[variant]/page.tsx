import { notFound } from "next/navigation";
import { GameScreen } from "@/components/game/GameScreen";
import type { AiTier, PlayColor, TutorDetail, Variant } from "@/lib/types";

const VARIANTS: Variant[] = ["standard", "chess960", "atomic", "koth"];
const TIERS: AiTier[] = [
  "beginner",
  "beginnerPlus",
  "club",
  "expert",
  "master",
  "elite",
];

export default async function PlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ variant: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { variant: raw } = await params;
  const sp = await searchParams;

  if (!VARIANTS.includes(raw as Variant)) notFound();
  const variant = raw as Variant;

  const tierRaw = typeof sp.tier === "string" ? sp.tier : "club";
  const detailRaw = typeof sp.detail === "string" ? sp.detail : "short";
  const colorRaw = typeof sp.color === "string" ? sp.color : "white";

  const tier = (TIERS.includes(tierRaw as AiTier) ? tierRaw : "club") as AiTier;
  const detail = (
    detailRaw === "detailed" ? "detailed" : "short"
  ) as TutorDetail;
  const color = (
    ["white", "black", "random"].includes(colorRaw) ? colorRaw : "white"
  ) as PlayColor;

  return (
    <GameScreen
      variant={variant}
      tier={tier}
      detail={detail}
      color={color}
    />
  );
}
