"use client";

import { AppNav } from "@/components/shell/AppNav";

export function AcademyShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="min-h-full bg-paper text-ink">
      <AppNav />
      {(title || subtitle) && (
        <div className="border-b border-ink/5 bg-paper px-4 py-4">
          <div className="mx-auto max-w-6xl">
            {title && (
              <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="mt-1 max-w-2xl text-[13px] text-ink/55">{subtitle}</p>
            )}
          </div>
        </div>
      )}
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

