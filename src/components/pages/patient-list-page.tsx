"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PatientShell } from "@/components/runtime/patient-shell";
import { MoodCheckinWidget } from "@/components/pages/mood-checkin-widget";
import { UpcomingAppointmentsCard } from "@/components/pages/upcoming-appointments-card";
import { Badge, Button, Card, EmptyState, PageSkeleton } from "@/components/ui/primitives";
import { listRuntimeSessionsForParticipant } from "@/lib/api/runtime-session-api";
import { getOrCreateParticipantForUser } from "@/lib/api/participant-api";
import { HOMEWORK_LABEL_BY_SESSION, hasHomeworkActivity } from "@/types/homework";
import { useT } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth/auth-context";

type ListedSession = Awaited<ReturnType<typeof listRuntimeSessionsForParticipant>>[number];

export function PatientListPage() {
  const { t } = useT();
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const participantQuery = useQuery({ queryKey: ["runtime-participant", userId], queryFn: () => getOrCreateParticipantForUser(userId), enabled: Boolean(userId) });
  const participant = participantQuery.data;
  // Scoped to this logged-in patient's own participant -- never the full
  // cross-patient list (that's the clinician-facing Patient Monitoring page).
  const sessionsQuery = useQuery({
    queryKey: ["runtime-sessions", participant?.id],
    queryFn: () => listRuntimeSessionsForParticipant(participant!.id),
    enabled: Boolean(participant),
  });
  const sessions = sessionsQuery.data ?? [];
  const stats = {
    total: sessions.length,
    active: sessions.filter((session) => ["active", "processing", "preparing"].includes(session.status)).length,
    waiting: sessions.filter((session) => session.status === "waiting_for_input").length,
    complete: sessions.filter((session) => session.status === "completed").length,
  };
  const sessionGroups = Array.from({ length: 8 }, (_, index) => {
    const number = index + 1;
    const definitionId = `tbct-s${String(number).padStart(2, "0")}`;
    const items = sessions
      .filter((session) => session.sessionDefinitionId === definitionId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    return { number, definitionId, items };
  });
  const otherSessions = sessions
    .filter((session) => !/^tbct-s0[1-8]$/.test(session.sessionDefinitionId))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  if (sessionsQuery.isLoading || participantQuery.isLoading) return <PatientShell title={t("patientPortal.title")}><PageSkeleton /></PatientShell>;
  return (
    <PatientShell
      title={t("patientPortal.title")}
      sessionLabel={participant?.alias}
      progressLabel={participant?.locale}
      actions={
        <>
          <Link href="/projects/demo/patient/profile"><Button variant="secondary">{t("patientPortal.profile")}</Button></Link>
          <Link href="/projects/demo/patient/messages"><Button variant="secondary">{t("messages.title")}</Button></Link>
          <Link href="/projects/demo/patient/memory"><Button variant="secondary">{t("patientPortal.memory")}</Button></Link>
          <Link href="/projects/demo/patient/sessions/new"><Button>{t("patientPortal.newSession")}</Button></Link>
        </>
      }
    >
      <div className="space-y-5">
        <Card className="overflow-hidden p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-clinical-blue">{t("patientPortal.eyebrow")}</div>
              <h2 className="mt-2 text-2xl font-semibold text-text-primary">{t("patientPortal.heading")}</h2>
              <p className="mt-2 max-w-2xl text-sm text-text-secondary">{t("patientPortal.description")}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:min-w-[280px]">
              <StatChip label={t("patientPortal.stats.total")} value={String(stats.total)} />
              <StatChip label={t("patientPortal.stats.active")} value={String(stats.active)} />
              <StatChip label={t("patientPortal.stats.waiting")} value={String(stats.waiting)} />
              <StatChip label={t("patientPortal.stats.complete")} value={String(stats.complete)} />
            </div>
          </div>
        </Card>
        {participant && <UpcomingAppointmentsCard participantId={participant.id} />}
        {participant && <MoodCheckinWidget participantId={participant.id} />}
        {!sessions.length && <Card><EmptyState title={t("patientPortal.noSessions.title")} description={t("patientPortal.noSessions.description")} /></Card>}
        <div className="space-y-5">
          {sessionGroups.map((group) => <SessionGroup key={group.definitionId} number={group.number} title={t("patientPortal.group.session", { number: group.number })} definitionId={group.definitionId} sessions={group.items} />)}
          {otherSessions.length > 0 && <SessionGroup title={t("patientPortal.group.other")} definitionId="Other" sessions={otherSessions} />}
        </div>
      </div>
    </PatientShell>
  );
}

function SessionGroup({ title, definitionId, sessions }: { title: string; definitionId: string; sessions: ListedSession[]; number?: number }) {
  const { t } = useT();
  const completed = sessions.filter((session) => session.status === "completed").length;
  const open = sessions.length - completed;
  return (
    <section className="overflow-hidden rounded-panel border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-subtle px-5 py-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          <div className="mt-1 text-xs text-text-muted">{definitionId}</div>
        </div>
        <div className="flex gap-2">
          <Badge tone="neutral">{t("patientPortal.group.total", { count: sessions.length })}</Badge>
          <Badge tone={open ? "warning" : "neutral"}>{t("patientPortal.group.open", { count: open })}</Badge>
          <Badge tone={completed ? "success" : "neutral"}>{t("patientPortal.group.complete", { count: completed })}</Badge>
        </div>
      </div>
      {sessions.length === 0 ? (
        <div className="px-5 py-5 text-sm text-text-muted">{t("patientPortal.group.empty")}</div>
      ) : (
        <div className="divide-y divide-border">
          {sessions.map((session) => <SessionRow key={session.id} session={session} />)}
        </div>
      )}
    </section>
  );
}

function SessionRow({ session }: { session: ListedSession }) {
  const { t } = useT();
  const tone = session.status === "completed" ? "success" : session.status === "escalated" || session.status === "safety_paused" ? "critical" : session.status === "waiting_for_input" ? "warning" : "primary";
  return (
    <div className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div>
            <div className="text-lg font-semibold text-text-primary">{session.patientAlias}</div>
            <div className="mt-1 text-sm text-text-secondary">{session.protocolId} · v{session.protocolVersion} · {session.sessionDefinitionId}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={tone}>{session.status}</Badge>
            <Badge tone="neutral">{session.locale}</Badge>
            <Badge tone="neutral">{t("patientPortal.row.updated")} {new Date(session.updatedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })} KST</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Inspector (raw runtime state/logs/provider events) is a clinician-only
              diagnostic view -- see the clinician's Patient Monitoring screen. Patients
              can only manage/continue their own session and view its summary. */}
          <Link href={`/projects/demo/patient/sessions/${session.id}`}><Button variant="secondary">{t("patientPortal.row.open")}</Button></Link>
          <Link href={`/runtime/sessions/${session.id}/summary`}><Button variant="secondary">{t("patientPortal.row.summary")}</Button></Link>
          {session.status === "completed" && hasHomeworkActivity(session.sessionDefinitionId) && (
            <Link href={`/projects/demo/patient/homework/${session.id}`}>
              <Button variant="violet">{HOMEWORK_LABEL_BY_SESSION[session.sessionDefinitionId]}</Button>
            </Link>
          )}
        </div>
      </div>
    </div>
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
