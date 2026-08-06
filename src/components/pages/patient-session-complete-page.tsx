"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PatientShell } from "@/components/runtime/patient-shell";
import { Button, Card, EmptyState, PageSkeleton } from "@/components/ui/primitives";
import { getRuntimeSession } from "@/lib/api/runtime-session-api";
import { getRuntimeSessionSummary } from "@/lib/api/session-summary-api";

export function PatientSessionCompletePage() {
  const params = useParams<{ sessionId: string }>();
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const sessionId = (Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId) ?? segments.at(-2) ?? "";
  const sessionQuery = useQuery({ queryKey: ["runtime-session-complete", sessionId], queryFn: () => getRuntimeSession(sessionId), enabled: Boolean(sessionId) });
  const summaryQuery = useQuery({ queryKey: ["runtime-session-summary-short", sessionId], queryFn: () => getRuntimeSessionSummary(sessionId), enabled: Boolean(sessionId) });
  if (sessionQuery.isLoading || summaryQuery.isLoading) return <PatientShell title="Session Complete"><PageSkeleton /></PatientShell>;
  if (!sessionQuery.data) return <PatientShell title="Session Complete"><Card><EmptyState title="Session not found" /></Card></PatientShell>;
  const { session, messages } = sessionQuery.data;
  return (
    <PatientShell title="Session Complete" sessionLabel={session.patientAlias} progressLabel={session.status}>
      <Card className="p-6">
        <div className="text-lg font-semibold text-text-primary">Session saved</div>
        <div className="mt-2 text-sm text-text-secondary">
          {messages.length} messages were stored. Some clinically allowed continuity items may be kept for a later session.
        </div>
        <div className="mt-2 text-xs text-text-secondary">
          Summary status: {summaryQuery.data?.summaryStatus ?? "draft pending generation"}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/projects/demo/patient"><Button variant="secondary">Sessions</Button></Link>
          <Link href="/projects/demo/patient/memory"><Button variant="secondary">Memory</Button></Link>
          <Link href={`/runtime/sessions/${session.id}/summary`}><Button variant="secondary">Summary</Button></Link>
        </div>
      </Card>
    </PatientShell>
  );
}
