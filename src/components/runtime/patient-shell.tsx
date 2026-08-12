"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Badge, Button } from "@/components/ui/primitives";
import { useT } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth/auth-context";

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
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {user?.email && <span className="hidden max-w-[160px] truncate text-xs text-text-secondary sm:inline">{user.email}</span>}
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
