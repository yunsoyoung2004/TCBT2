"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge, Button } from "@/components/ui/primitives";
import { LocaleToggle } from "@/components/ui/locale-toggle";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useT } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth/auth-context";
import { getOrCreateParticipantForUser } from "@/lib/api/participant-api";
import { applyPatientLocaleChange } from "@/lib/api/patient-locale-sync";
import { fadeUp } from "@/lib/motion/motion-variants";
import { useReducedMotionPreference } from "@/lib/motion/use-reduced-motion-preference";

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
  const pathname = usePathname();
  const reducedMotion = useReducedMotionPreference();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  // Reuses the same ["runtime-participant", userId] query every patient
  // page already mounts -- React Query dedupes the identical key, so this
  // never fires a second network request, it just gives this shared header
  // a handle on the participant record so the language toggle can sync
  // participant.locale + open sessions (see patient-locale-sync.ts), not
  // only the website's own UI chrome text.
  const participantQuery = useQuery({
    queryKey: ["runtime-participant", user?.id ?? ""],
    queryFn: () => getOrCreateParticipantForUser(user!.id),
    enabled: Boolean(user?.id),
  });
  const handleLogout = async () => {
    await signOut();
    router.push("/patient/login");
  };
  const handleLocaleChange = async (next: "ko" | "en") => {
    const participant = participantQuery.data;
    if (!participant) return;
    try {
      const updatedSessionCount = await applyPatientLocaleChange(participant, next);
      await queryClient.invalidateQueries({ queryKey: ["runtime-participant"] });
      await queryClient.invalidateQueries({ queryKey: ["runtime-sessions"] });
      await queryClient.invalidateQueries({ queryKey: ["patient-runtime-session"] });
      toast.success(
        updatedSessionCount > 0
          ? t("patientShell.localeSynced.withSessions", { count: updatedSessionCount })
          : t("patientShell.localeSynced.profileOnly"),
      );
    } catch {
      // Non-critical -- the UI chrome language itself already switched via
      // LocaleToggle's own setLocale call regardless of this promise's
      // outcome, so a failed sync here degrades to "chrome language changed,
      // participant record/sessions didn't" rather than blocking anything.
      toast.error(t("patientShell.localeSyncFailed"));
    }
  };
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface px-4 py-4 lg:px-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Logo className="mt-0.5 h-9 w-9 shrink-0" />
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
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {user?.email && <span className="hidden max-w-[160px] truncate text-xs text-text-secondary sm:inline">{user.email}</span>}
            <LocaleToggle onChange={(next) => void handleLocaleChange(next)} />
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
      <main className="mx-auto max-w-5xl p-4 lg:p-6">
        {/* Every patient page wraps itself in its own <PatientShell> (see
            studio-app.tsx's routing), so this is the one shared place that
            gives every one of them the same subtle enter transition on
            navigation instead of popping in instantly -- matches the same
            treatment on the clinician side (see app-shell.tsx). */}
        <motion.div
          key={pathname}
          initial={reducedMotion ? false : "initial"}
          animate={reducedMotion ? undefined : "animate"}
          variants={reducedMotion ? undefined : fadeUp}
        >
          {children}
        </motion.div>
      </main>
      <footer className="border-t border-border bg-surface px-4 py-3 text-xs text-text-secondary lg:px-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <span>{t("patientShell.demoNotice")}</span>
          <span>{t("patientShell.safetyNotice")}</span>
        </div>
      </footer>
    </div>
  );
}
