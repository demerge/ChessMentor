"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCardStore } from "@/store/cardStore";
import { useLearningStore } from "@/store/learningStore";
import { useAcademyStore, certRankTitle } from "@/store/academyStore";

const LINKS = [
  { href: "/", label: "Play" },
  { href: "/academy", label: "Academy" },
  { href: "/academy/library", label: "Library" },
  { href: "/academy/lab", label: "Lab" },
  { href: "/academy/arena", label: "Arena" },
  { href: "/academy/certification", label: "Certification" },
];

export function AppNav({
  subtitle,
}: {
  subtitle?: string;
}) {
  const pathname = usePathname();
  const xp = useCardStore((s) => s.xp);
  const sessionXp = useCardStore((s) => s.sessionXp);
  const focus = useLearningStore((s) => s.tutorFocus);

  const academyProgress = useAcademyStore((s) => s.progress);
  const academyLoaded = useAcademyStore((s) => s.loaded);
  const loadAcademy = useAcademyStore((s) => s.load);

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!academyLoaded) {
      void loadAcademy();
    }
  }, [academyLoaded, loadAcademy]);

  return (
    <header className="relative z-50 shrink-0 border-b border-ink/15 bg-paper">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/" className="shrink-0 text-[15px] font-semibold tracking-tight">
            ChessMentor
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => {
              const active =
                l.href === "/"
                  ? pathname === "/" || pathname.startsWith("/play")
                  : l.href === "/academy"
                    ? pathname === "/academy" || (pathname.startsWith("/academy/") && ![
                        "/academy/library",
                        "/academy/lab",
                        "/academy/arena",
                        "/academy/certification"
                      ].some((path) => pathname.startsWith(path)))
                    : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.label}
                  href={l.href}
                  className={`px-2.5 py-1 text-[12px] tracking-wide transition-colors ${
                    active
                      ? "border-b border-ink text-ink font-medium"
                      : "text-ink/45 hover:text-ink"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-[10px] sm:text-[11px] text-ink/50">
            {focus[0] && (
              <span className="hidden lg:inline">Focus · {focus[0]}</span>
            )}
            <span
              className="border border-ink/15 bg-ink/[0.01] px-1.5 py-0.5 text-ink/75"
              title="Academy certification rank and academy XP"
            >
              {certRankTitle(academyProgress.certRank)} · {academyProgress.xp} XP
            </span>
            <span
              className="border border-ink/15 bg-ink/[0.01] px-1.5 py-0.5 text-ink"
              title="Game session XP"
            >
              Game · {xp}
              {sessionXp > 0 ? ` · +${sessionXp}` : ""}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex h-7 w-7 items-center justify-center border border-ink/15 hover:bg-ink/5 md:hidden"
            aria-label="Toggle menu"
          >
            <span className="text-[12px]">{isOpen ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>
      {isOpen && (
        <nav className="border-t border-ink/10 bg-paper py-1.5 md:hidden">
          {LINKS.map((l) => {
            const active =
              l.href === "/"
                ? pathname === "/" || pathname.startsWith("/play")
                : l.href === "/academy"
                  ? pathname === "/academy" || (pathname.startsWith("/academy/") && ![
                      "/academy/library",
                      "/academy/lab",
                      "/academy/arena",
                      "/academy/certification"
                    ].some((path) => pathname.startsWith(path)))
                  : pathname.startsWith(l.href);
            return (
              <Link
                key={l.label}
                href={l.href}
                onClick={() => setIsOpen(false)}
                className={`block px-4 py-2 text-[13px] tracking-wide transition-colors ${
                  active
                    ? "bg-ink/5 text-ink font-semibold"
                    : "text-ink/55 hover:bg-ink/[0.02] hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      )}
      {subtitle && (
        <div className="border-t border-ink/5 px-4 py-1.5 font-mono text-[10px] text-ink/40">
          {subtitle}
        </div>
      )}
    </header>
  );
}

