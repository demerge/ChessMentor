import type { Classification } from "@/lib/types";
import { CLASSIFICATION_META } from "@/lib/types";

const colorClass: Record<Classification, string> = {
  brilliant: "text-good",
  best: "text-good",
  good: "text-ink/70",
  inaccuracy: "text-ink/60",
  mistake: "text-signal",
  blunder: "text-signal",
};

export function ClassificationIcon({
  classification,
  showLabel = false,
}: {
  classification: Classification;
  showLabel?: boolean;
}) {
  const meta = CLASSIFICATION_META[classification];
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-xs ${colorClass[classification]}`}
      title={meta.label}
    >
      <span aria-hidden>{meta.icon}</span>
      {showLabel && <span>{meta.label}</span>}
    </span>
  );
}
