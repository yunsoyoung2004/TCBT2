"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { HelpCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Badge, Button } from "@/components/ui/primitives";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useT } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth/auth-context";

export function PatientShell({
  title,
  sessionLabel,
  progressLabel,
  progressPercent,
  saveState,
  children,
  actions,
}: {
  title: string;
  sessionLabel?: string;
  progressLabel?: string;
  /** 0-100 -- renders a thin progress bar under the title/badges row (see
   * computeSessionProgress in patient-session-page.tsx). Distinct from
   * progressLabel, which several other patient pages already use for an
   * unrelated status/locale badge -- adding this as its own prop keeps
   * those call sites unaffected. */
  progressPercent?: number;
  saveState?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const { t } = useT();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const handleLogout = async () => {
    await signOut();
    router.push("/patient/login");
  };
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface px-4 py-4 lg:px-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-clinical-blue">{t("patientShell.eyebrow")}</div>
            <h1 className="mt-1 text-xl font-semibold text-text-primary">{title}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              {sessionLabel && <Badge tone="primary">{sessionLabel}</Badge>}
              {progressLabel && <Badge tone="neutral">{progressLabel}</Badge>}
              {saveState && <Badge tone="success">{saveState}</Badge>}
            </div>
            {progressPercent !== undefined && (
              <div className="mt-3 max-w-xs">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full bg-clinical-blue transition-[width] duration-500" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-text-muted">{t("patientShell.sessionProgress", { percent: progressPercent })}</div>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {user?.email && <span className="hidden max-w-[160px] truncate text-xs text-text-secondary sm:inline">{user.email}</span>}
            <span data-tour-id="theme-toggle"><ThemeToggle /></span>
            {/* Replays the onboarding tour -- it only ever mounts on the
                session-list page (see patient-list-page.tsx), so this
                button (present on every patient page via this shared shell)
                links there with a flag that page picks up on load. */}
            <Link href="/projects/demo/patient?tour=1">
              <Button size="icon" variant="ghost" title={t("onboarding.replayTour")}>
                <HelpCircle className="h-4 w-4" />
              </Button>
            </Link>
            <span data-tour-id="crisis-help">
              <Link href="/crisis" target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" className="border-critical text-critical hover:bg-critical-light">{t("patientShell.crisisHelp")}</Button>
              </Link>
            </span>
            <Link href="/projects/demo/patient"><Button variant="secondary">{t("patientShell.sessionList")}</Button></Link>
            {actions}
            <Button variant="ghost" onClick={() => void handleLogout()}>{t("auth.logout")}</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4 lg:p-6">{children}</main>
      <footer className="border-t border-border bg-surface px-4 py-3 text-xs text-text-secondary lg:px-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <span>{t("patientShell.demoNotice")}</span>
          <span>{t("patientShell.safetyNotice")}</span>
        </div>
      </footer>
    </div>
  );
}
