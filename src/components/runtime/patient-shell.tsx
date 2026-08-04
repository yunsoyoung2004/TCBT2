"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, Button } from "@/components/ui/primitives";

export function PatientShell({
  title,
  sessionLabel,
  progressLabel,
  saveState,
  children,
  actions,
}: {
  title: string;
  sessionLabel?: string;
  progressLabel?: string;
  saveState?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface px-4 py-4 lg:px-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-clinical-blue">TBCT Program</div>
            <h1 className="mt-1 text-xl font-semibold text-text-primary">{title}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              {sessionLabel && <Badge tone="primary">{sessionLabel}</Badge>}
              {progressLabel && <Badge tone="neutral">{progressLabel}</Badge>}
              {saveState && <Badge tone="success">{saveState}</Badge>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/projects/demo/patient"><Button variant="secondary">Session List</Button></Link>
            {actions}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4 lg:p-6">{children}</main>
      <footer className="border-t border-border bg-surface px-4 py-3 text-xs text-text-secondary lg:px-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <span>Demo Mode · No real patient personal data is stored.</span>
          <span>Human safety oversight enabled</span>
        </div>
      </footer>
    </div>
  );
}
