"use client";

import type { ReactNode } from "react";

export type CardTone = "default" | "good" | "signal" | "muted" | "accent";

const toneBorder: Record<CardTone, string> = {
  default: "border-ink/15",
  good: "border-good/40",
  signal: "border-signal/35",
  muted: "border-ink/10",
  accent: "border-ink/25",
};

/**
 * Swiss card primitive — hairline border, no shadows, tight hierarchy.
 * Cards only appear when parent decides they add value.
 */
export function Card({
  children,
  title,
  eyebrow,
  tone = "default",
  action,
  className = "",
  compact = false,
}: {
  children: ReactNode;
  title?: string;
  eyebrow?: string;
  tone?: CardTone;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <section
      className={`card-shell border bg-paper ${toneBorder[tone]} ${className}`}
      data-card
    >
      {(eyebrow || title || action) && (
        <header
          className={`flex items-start justify-between gap-2 border-b border-ink/10 ${
            compact ? "px-3 py-2" : "px-3.5 py-2.5"
          }`}
        >
          <div className="min-w-0">
            {eyebrow && (
              <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink/45">
                {eyebrow}
              </p>
            )}
            {title && (
              <h3 className="mt-0.5 text-[13px] font-semibold leading-tight tracking-tight text-ink">
                {title}
              </h3>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={compact ? "px-3 py-2.5" : "px-3.5 py-3"}>{children}</div>
    </section>
  );
}

export function CardRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5 text-[12px]">
      <span className="text-ink/50">{label}</span>
      <span
        className={`text-right text-ink ${mono ? "font-mono text-[11px]" : "font-medium"}`}
      >
        {value}
      </span>
    </div>
  );
}

export function CardBadge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "good" | "signal" | "neutral";
}) {
  const c =
    tone === "good"
      ? "bg-good/10 text-good"
      : tone === "signal"
        ? "bg-signal/10 text-signal"
        : tone === "neutral"
          ? "bg-ink/5 text-ink/50"
          : "bg-ink/5 text-ink";
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${c}`}
    >
      {children}
    </span>
  );
}

export function ProgressBar({
  value,
  label,
}: {
  value: number;
  label?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div>
      {label && (
        <div className="mb-1 flex justify-between text-[11px]">
          <span className="text-ink/70">{label}</span>
          <span className="font-mono text-ink/45">{v}%</span>
        </div>
      )}
      <div className="h-1 w-full bg-ink/10">
        <div
          className="h-full bg-ink transition-all duration-500"
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}

export function StarRating({
  value,
  onChange,
  max = 5,
}: {
  value: number;
  onChange?: (n: number) => void;
  max?: number;
}) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => {
        const n = i + 1;
        const on = n <= value;
        return (
          <button
            key={n}
            type="button"
            disabled={!onChange}
            onClick={() => onChange?.(n)}
            className={`text-sm leading-none ${on ? "text-ink" : "text-ink/20"} ${
              onChange ? "hover:text-ink/70" : ""
            }`}
            aria-label={`${n} stars`}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}
