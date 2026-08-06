"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PatientShell } from "@/components/runtime/patient-shell";
import { Button, Card, EmptyState, PageSkeleton } from "@/components/ui/primitives";
import { getRuntimeSession } from "@/lib/api/runtime-session-api";
import { getRuntimeSessionSummary } from "@/lib/api/session-summary-api";
import { useT } from "@/lib/i18n/context";

export function PatientSessionCompletePage() {
  const { t } = useT();
  const params = useParams<{ sessionId: string }>();
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const sessionId = (Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId) ?? segments.at(-2) ?? "";
  const sessionQuery = useQuery({ queryKey: ["runtime-session-complete", sessionId], queryFn: () => getRuntimeSession(sessionId), enabled: Boolean(sessionId) });
  const summaryQuery = useQuery({ queryKey: ["runtime-session-summary-short", sessionId], queryFn: () => getRuntimeSessionSummary(sessionId), enabled: Boolean(sessionId) });
  if (sessionQuery.isLoading || summaryQuery.isLoading) return <PatientShell title={t("patientSessionComplete.title")}><PageSkeleton /></PatientShell>;
  if (!sessionQuery.data) return <PatientShell title={t("patientSessionComplete.title")}><Card><EmptyState title={t("patientSessionComplete.notFound")} /></Card></PatientShell>;
  const { session, messages } = sessionQuery.data;
  return (
    <PatientShell title={t("patientSessionComplete.title")} sessionLabel={session.patientAlias} progressLabel={session.status}>
      <Card className="p-6">
        <div className="text-lg font-semibold text-text-primary">{t("patientSessionComplete.saved")}</div>
        <div className="mt-2 text-sm text-text-secondary">
          {t("patientSessionComplete.stored", { count: messages.length })}
        </div>
        <div className="mt-2 text-xs text-text-secondary">
          {t("patientSessionComplete.summaryStatus")}: {summaryQuery.data?.summaryStatus ?? t("patientSessionComplete.draftPending")}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/projects/demo/patient"><Button variant="secondary">{t("patientSessionComplete.sessions")}</Button></Link>
          <Link href="/projects/demo/patient/memory"><Button variant="secondary">{t("patientSessionComplete.memory")}</Button></Link>
          <Link href={`/runtime/sessions/${session.id}/summary`}><Button variant="secondary">{t("patientSessionComplete.summary")}</Button></Link>
        </div>
      </Card>
    </PatientShell>
  );
}
