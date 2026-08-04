"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PatientShell } from "@/components/runtime/patient-shell";
import { Badge, Button, Card, EmptyState, PageSkeleton } from "@/components/ui/primitives";
import { listRuntimeSessions } from "@/lib/api/runtime-session-api";
import { getOrCreateDemoParticipant } from "@/lib/api/participant-api";

export function PatientListPage() {
  const sessionsQuery = useQuery({ queryKey: ["runtime-sessions"], queryFn: listRuntimeSessions });
  const participantQuery = useQuery({ queryKey: ["runtime-participant-demo"], queryFn: getOrCreateDemoParticipant });
  const participant = participantQuery.data;
  const sessions = sessionsQuery.data ?? [];
  const stats = {
    total: sessions.length,
    active: sessions.filter((session) => session.status === "active").length,
    waiting: sessions.filter((session) => session.status === "waiting_for_input").length,
    complete: sessions.filter((session) => session.status === "completed").length,
  };
  if (sessionsQuery.isLoading || participantQuery.isLoading) return <PatientShell title="Sessions"><PageSkeleton /></PatientShell>;
  return (
    <PatientShell
      title="Sessions"
      sessionLabel={participant?.alias}
      progressLabel={participant?.locale}
      actions={
        <>
          <Link href="/projects/demo/patient/profile"><Button variant="secondary">Profile</Button></Link>
          <Link href="/projects/demo/patient/memory"><Button variant="secondary">Memory</Button></Link>
          <Link href="/projects/demo/patient/sessions/new"><Button>New session</Button></Link>
        </>
      }
    >
      <div className="space-y-5">
        <Card className="overflow-hidden p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-clinical-blue">Patient portal</div>
              <h2 className="mt-2 text-2xl font-semibold text-text-primary">Your current sessions</h2>
              <p className="mt-2 max-w-2xl text-sm text-text-secondary">A session appears here as soon as it is created. Open the session to continue, review the inspector, or read the saved summary.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
              <StatChip label="Total" value={String(stats.total)} />
              <StatChip label="Active" value={String(stats.active)} />
              <StatChip label="Waiting" value={String(stats.waiting)} />
              <StatChip label="Complete" value={String(stats.complete)} />
            </div>
          </div>
        </Card>
        {!sessions.length && <Card><EmptyState title="No runtime sessions" description="Start a session from a published release." /></Card>}
        <div className="grid gap-4">
          {sessions.map((session) => (
            <Card key={session.id} className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                  <div>
                    <div className="text-lg font-semibold text-text-primary">{session.patientAlias}</div>
                    <div className="mt-1 text-sm text-text-secondary">{session.protocolId} · v{session.protocolVersion} · {session.sessionDefinitionId}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={session.status === "completed" ? "success" : session.status === "escalated" ? "critical" : session.status === "waiting_for_input" ? "warning" : "primary"}>{session.status}</Badge>
                    <Badge tone="neutral">{session.locale}</Badge>
                    <Badge tone="neutral">Updated {new Date(session.updatedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/projects/demo/patient/sessions/${session.id}`}><Button variant="secondary">Open</Button></Link>
                  <Link href={`/runtime/sessions/${session.id}`}><Button variant="secondary">Inspector</Button></Link>
                  <Link href={`/runtime/sessions/${session.id}/summary`}><Button variant="secondary">Summary</Button></Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </PatientShell>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-panel border border-border bg-surface-subtle px-3 py-2">
      <div className="text-[11px] uppercase tracking-[0.08em] text-text-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold text-text-primary">{value}</div>
    </div>
  );
}
