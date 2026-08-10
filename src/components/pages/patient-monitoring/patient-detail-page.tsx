"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { StreamingText } from "@/components/runtime/streaming-text";
import { useReducedMotionPreference } from "@/lib/motion/use-reduced-motion-preference";
import {
  Badge,
  Button,
  Card,
  ConfirmActionDialog,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  PageSkeleton,
  SectionHeader,
  inputClass,
  textareaClass,
} from "@/components/ui/primitives";
import { useT } from "@/lib/i18n/context";
import { getRuntimeParticipant } from "@/lib/api/participant-api";
import { getRuntimeSession, listCanonicalTestSessions, listRuntimeSessions } from "@/lib/api/runtime-session-api";
import { pauseRuntimeSession, resumeRuntimeSession, terminateRuntimeSession } from "@/lib/api/runtime-execution-api";
import { addClinicianNote, deleteClinicianNote, getClinicianNotes } from "@/lib/api/longitudinal-memory-api";
import { getSafetyEvents } from "@/lib/api/safety-operations-api";
import {
  deriveMonitoringStatus,
  findSessionTitle,
  findStepTitle,
  isOpenSafetyEvent,
  summarizeParticipant,
  type MonitoringStatus,
} from "@/components/pages/patient-monitoring/patient-monitoring-utils";
import { HomeworkPanel } from "@/components/pages/patient-monitoring/homework-panel";
import { WorksheetPane } from "@/components/runtime/worksheet-pane";
import { hasWorksheetBindings } from "@/lib/worksheet/worksheet-binding-registry";
import type { RuntimeMessageRole, RuntimeSession } from "@/types/runtime-session";

type AuditFilter = "all" | "program" | "patient" | "notes";

const STATUS_TONE: Record<MonitoringStatus, "primary" | "warning" | "critical" | "success" | "neutral"> = {
  inProgress: "primary",
  paused: "warning",
  needsReview: "critical",
  completed: "success",
  notStarted: "neutral",
};

function formatTimestamp(value?: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString();
}

interface TimelineEntry {
  id: string;
  kind: "message" | "note" | "lifecycle";
  speaker: "program" | "patient" | "clinician";
  content: string;
  stepTitle?: string;
  createdAt: string;
  sessionDefinitionId?: string;
  nodeId?: string;
  promptItemId?: string;
}

export function PatientMonitoringDetailPage() {
  const { t } = useT();
  const params = useParams<{ participantId?: string | string[] }>();
  const pathname = usePathname();
  const router = useRouter();
  const participantId =
    (Array.isArray(params?.participantId) ? params.participantId[0] : params?.participantId) ??
    pathname.split("/").filter(Boolean).at(-1) ??
    "";

  const queryClient = useQueryClient();
  const reducedMotion = useReducedMotionPreference();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [auditFilter, setAuditFilter] = useState<AuditFilter>("all");
  const [activeTab, setActiveTab] = useState<"audit" | "worksheet" | "profile">("audit");
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteToDelete, setNoteToDelete] = useState<{ id: string; content: string } | null>(null);

  const participantQuery = useQuery({
    queryKey: ["patient-monitoring-participant", participantId],
    queryFn: () => getRuntimeParticipant(participantId),
    enabled: Boolean(participantId),
  });

  const participant = participantQuery.data;
  const sessionIds = participant?.runtimeSessionIds ?? [];

  const safetyQuery = useQuery({
    queryKey: ["patient-monitoring-safety-events", participantId],
    queryFn: getSafetyEvents,
    enabled: Boolean(participantId),
    refetchInterval: 5000,
  });

  const canonicalSessionsQuery = useQuery({ queryKey: ["patient-monitoring-canonical-sessions"], queryFn: listCanonicalTestSessions });

  const allRuntimeSessionsQuery = useQuery({ queryKey: ["patient-monitoring-sessions"], queryFn: listRuntimeSessions, refetchInterval: 5000 });

  const summary = useMemo(
    () => summarizeParticipant(participantId, allRuntimeSessionsQuery.data ?? [], safetyQuery.data ?? [], participant?.updatedAt),
    [participantId, allRuntimeSessionsQuery.data, safetyQuery.data, participant?.updatedAt],
  );

  // Prefers the smartest "current" pick (skips terminal sessions when a
  // live one exists); falls back to the participant record's own session
  // list only while summary.sessions hasn't loaded yet.
  const effectiveSessionId = selectedSessionId ?? summary.currentSession?.id ?? sessionIds.at(-1) ?? "";

  const sessionViewQuery = useQuery({
    queryKey: ["patient-monitoring-session-view-detail", effectiveSessionId],
    queryFn: () => getRuntimeSession(effectiveSessionId),
    enabled: Boolean(effectiveSessionId),
    refetchInterval: 5000,
  });

  // Messages already on screen the first time a session loads (or is switched to)
  // are shown statically; only ones that arrive afterwards stream in.
  const historicalMessageIdsRef = useRef<{ sessionId: string; ids: Set<string> } | null>(null);

  const memoriesQuery = useQuery({
    queryKey: ["patient-monitoring-memories", participantId],
    queryFn: () => getClinicianNotes(participantId),
    enabled: Boolean(participantId),
  });

  // Every individual session run for this participant, grouped by session
  // definition and newest-first -- the "Sessions" list used to show only
  // one aggregated status per definition, which hid every earlier attempt
  // at the same session (e.g. repeated test runs of S01).
  const sessionsByDefinition = useMemo(() => {
    const map = new Map<string, RuntimeSession[]>();
    for (const item of summary.sessions) {
      const list = map.get(item.sessionDefinitionId) ?? [];
      list.push(item);
      map.set(item.sessionDefinitionId, list);
    }
    for (const list of map.values()) list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return map;
  }, [summary.sessions]);

  const runStatus = (item: RuntimeSession): MonitoringStatus =>
    deriveMonitoringStatus(item.status, (safetyQuery.data ?? []).some((event) => event.runtimeSessionId === item.id && isOpenSafetyEvent(event)));

  const sessionLabel = (item: RuntimeSession) =>
    `${findSessionTitle(item.sessionDefinitionId) ?? item.sessionDefinitionId} · ${t(`patientMonitoring.status.${runStatus(item)}`)} · ${formatTimestamp(item.updatedAt)}`;

  const openSession = (sessionId: string, tab: "audit" | "worksheet" | "profile" = "audit") => {
    setSelectedSessionId(sessionId);
    setActiveTab(tab);
  };

  const invalidateSession = async () => {
    await queryClient.invalidateQueries({ queryKey: ["patient-monitoring-session-view-detail", effectiveSessionId] });
    await queryClient.invalidateQueries({ queryKey: ["patient-monitoring-sessions"] });
  };

  const pauseMutation = useMutation({
    mutationFn: () => pauseRuntimeSession(effectiveSessionId, t("patientDetail.reasons.pause")),
    onSuccess: async () => {
      toast.success(t("patientDetail.actions.pause"));
      await invalidateSession();
    },
  });
  const resumeMutation = useMutation({
    mutationFn: () => resumeRuntimeSession(effectiveSessionId),
    onSuccess: async () => {
      toast.success(t("patientDetail.actions.resume"));
      await invalidateSession();
    },
  });
  const endMutation = useMutation({
    mutationFn: () => terminateRuntimeSession(effectiveSessionId, t("patientDetail.reasons.end")),
    onSuccess: async () => {
      toast.success(t("patientDetail.actions.end"));
      await invalidateSession();
    },
  });
  const addNoteMutation = useMutation({
    mutationFn: (content: string) =>
      addClinicianNote({
        participantId,
        projectId: participant?.projectId ?? "",
        sourceSessionId: effectiveSessionId,
        content,
      }),
    onSuccess: async () => {
      toast.success(t("patientDetail.note.success"));
      setNoteDraft("");
      setNoteModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["patient-monitoring-memories", participantId] });
    },
  });
  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => deleteClinicianNote(noteId),
    onSuccess: async () => {
      toast.success(t("patientDetail.note.deleteSuccess"));
      setNoteToDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["patient-monitoring-memories", participantId] });
    },
  });

  const session = sessionViewQuery.data?.session;
  const nodes = useMemo(() => sessionViewQuery.data?.nodes ?? [], [sessionViewQuery.data?.nodes]);
  const status = summary.monitoringStatus;
  const currentNode = nodes.find((node) => node.id === session?.currentNodeId);

  const clinicianNotes = useMemo(() => memoriesQuery.data ?? [], [memoriesQuery.data]);

  const timeline = useMemo<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = [];
    const speakerFor = (role: RuntimeMessageRole): TimelineEntry["speaker"] =>
      role === "patient" ? "patient" : role === "clinician" ? "clinician" : "program";

    for (const message of sessionViewQuery.data?.messages ?? []) {
      entries.push({
        id: `message-${message.id}`,
        kind: "message",
        speaker: speakerFor(message.role),
        content: message.content,
        stepTitle: findStepTitle(message.nodeId) ?? nodes.find((node) => node.id === message.nodeId)?.title,
        createdAt: message.createdAt,
        sessionDefinitionId: session?.sessionDefinitionId,
        nodeId: message.nodeId,
        promptItemId: message.promptItemId,
      });
    }

    for (const note of clinicianNotes.filter((memory) => memory.sourceSessionId === effectiveSessionId)) {
      entries.push({
        id: `note-${note.id}`,
        kind: "note",
        speaker: "clinician",
        content: note.content,
        createdAt: note.createdAt,
      });
    }

    if (session?.startedAt) {
      entries.push({ id: "lifecycle-started", kind: "lifecycle", speaker: "program", content: t("patientDetail.audit.lifecycle.started"), createdAt: session.startedAt });
    }
    if (session?.pausedAt) {
      entries.push({ id: "lifecycle-paused", kind: "lifecycle", speaker: "program", content: t("patientDetail.audit.lifecycle.paused"), createdAt: session.pausedAt });
    }
    if (session?.resumedAt) {
      entries.push({ id: "lifecycle-resumed", kind: "lifecycle", speaker: "program", content: t("patientDetail.audit.lifecycle.resumed"), createdAt: session.resumedAt });
    }
    if (session?.completedAt || session?.terminatedAt) {
      entries.push({
        id: "lifecycle-ended",
        kind: "lifecycle",
        speaker: "program",
        content: t("patientDetail.audit.lifecycle.ended"),
        createdAt: session.completedAt ?? session.terminatedAt ?? "",
      });
    }

    return entries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [sessionViewQuery.data?.messages, clinicianNotes, effectiveSessionId, nodes, session, t]);

  useEffect(() => {
    const messageIds = timeline.filter((entry) => entry.kind === "message").map((entry) => entry.id);
    if (!messageIds.length) return;
    if (historicalMessageIdsRef.current?.sessionId !== effectiveSessionId) {
      historicalMessageIdsRef.current = { sessionId: effectiveSessionId, ids: new Set(messageIds) };
    }
  }, [effectiveSessionId, timeline]);

  const filteredTimeline = useMemo(() => {
    if (auditFilter === "all") return timeline;
    if (auditFilter === "notes") return timeline.filter((entry) => entry.kind === "note" || entry.kind === "lifecycle");
    if (auditFilter === "program") return timeline.filter((entry) => entry.speaker === "program" || entry.kind === "lifecycle");
    return timeline.filter((entry) => entry.speaker === "patient");
  }, [timeline, auditFilter]);

  const sessionProgress = useMemo(() => {
    const canonical = canonicalSessionsQuery.data ?? [];
    return canonical.map((definition) => {
      const matched = summary.sessions.find((candidate) => candidate.sessionDefinitionId === definition.id);
      const matchedSummary = summarizeParticipant(participantId, matched ? [matched] : [], safetyQuery.data ?? []);
      return {
        id: definition.id,
        number: definition.number,
        title: definition.title,
        status: matched ? matchedSummary.monitoringStatus : "notStarted",
      } satisfies { id: string; number: number; title: string; status: MonitoringStatus };
    });
  }, [canonicalSessionsQuery.data, summary.sessions, safetyQuery.data, participantId]);

  if (participantQuery.isLoading) {
    return (
      <AppShell>
        <PageSkeleton />
      </AppShell>
    );
  }

  if (!participant) {
    return (
      <AppShell>
        <Card className="m-4 lg:m-6">
          <EmptyState title={t("patientDetail.notFound")} />
        </Card>
      </AppShell>
    );
  }

  const speakerLabel = (speaker: TimelineEntry["speaker"]) =>
    speaker === "program" ? t("patientDetail.audit.speaker.program") : speaker === "patient" ? t("patientDetail.audit.speaker.patient") : t("patientDetail.audit.speaker.clinician");

  const canPause = session?.status === "active" || session?.status === "waiting_for_input";
  const canResume = session?.status === "paused";
  const canEnd = Boolean(session) && session?.status !== "completed" && session?.status !== "terminated";

  return (
    <AppShell>
      <PageHeader
        title={participant.alias}
        description={t("patientDetail.description")}
        eyebrow={t("nav.patientMonitoring")}
        meta={
          <>
            <Badge tone={STATUS_TONE[status]}>{t(`patientMonitoring.status.${status}`)}</Badge>
            <Badge tone="neutral">
              {t("patientDetail.summary.lastActivity")}: {formatTimestamp(session?.updatedAt ?? participant.updatedAt)}
            </Badge>
          </>
        }
        actions={
          session ? (
            <Link href={`/runtime/sessions/${session.id}`}>
              <Button variant="secondary">{t("patientDetail.actions.inspector")}</Button>
            </Link>
          ) : undefined
        }
      />

      {/* Mobile (<640px): compact "who/what" context line so it's never lost
          while scrolling a long tab (brief §13), then a tap-strip covering
          the same three tabs/state as the desktop buttons below -- so the
          clinician sees Profile/Sessions/Worksheet exist immediately. */}
      <div className="border-b border-border bg-surface px-4 py-2 sm:hidden">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="truncate font-semibold text-text-primary">{participant.alias}</span>
          <span className="shrink-0 text-text-muted">{formatTimestamp(session?.updatedAt ?? participant.updatedAt)}</span>
        </div>
      </div>
      <div className="border-b border-border bg-surface px-4 lg:px-6">
        <div className="flex gap-1 py-2 sm:hidden">
          {(["profile", "audit", "worksheet"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`min-h-[44px] flex-1 rounded-panel border text-xs font-semibold transition ${
                activeTab === tab ? "border-clinical-blue bg-clinical-blue-light text-clinical-blue" : "border-border text-text-secondary"
              }`}
            >
              {tab === "audit" ? t("patientDetail.tabs.auditLog") : tab === "worksheet" ? t("patientDetail.tabs.worksheet") : t("patientDetail.tabs.profile")}
            </button>
          ))}
        </div>
        <div className="hidden gap-1 pt-2 sm:flex">
          {(["audit", "worksheet", "profile"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-t-panel border-b-2 px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab ? "border-clinical-blue text-clinical-blue" : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab === "audit" ? t("patientDetail.tabs.auditLog") : tab === "worksheet" ? t("patientDetail.tabs.worksheet") : t("patientDetail.tabs.profile")}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 p-4 lg:p-6">
        {summary.sessions.length > 1 && (
          <Field label={t("patientDetail.sessionSelector")}>
            <select className={inputClass} value={effectiveSessionId} onChange={(event) => setSelectedSessionId(event.target.value)}>
              {[...summary.sessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((item) => (
                <option key={item.id} value={item.id}>
                  {sessionLabel(item)}
                </option>
              ))}
            </select>
          </Field>
        )}

        {activeTab === "audit" ? (
          <div className="grid gap-4 xl:grid-cols-[1.25fr_.85fr]">
            <Card>
              <SectionHeader
                title={t("patientDetail.tabs.auditLog")}
                action={
                  <select className={inputClass} value={auditFilter} onChange={(event) => setAuditFilter(event.target.value as AuditFilter)}>
                    <option value="all">{t("patientDetail.audit.filters.all")}</option>
                    <option value="program">{t("patientDetail.audit.filters.program")}</option>
                    <option value="patient">{t("patientDetail.audit.filters.patient")}</option>
                    <option value="notes">{t("patientDetail.audit.filters.notes")}</option>
                  </select>
                }
              />
              <div className="max-h-[560px] space-y-3 overflow-auto p-4">
                {sessionViewQuery.isLoading ? (
                  <PageSkeleton />
                ) : filteredTimeline.length === 0 ? (
                  <EmptyState title={t("patientDetail.audit.noEntries")} />
                ) : (
                  filteredTimeline.map((entry) => {
                    const isNewMessage = entry.kind === "message"
                      && historicalMessageIdsRef.current?.sessionId === effectiveSessionId
                      && !historicalMessageIdsRef.current.ids.has(entry.id);
                    const canInspect = entry.kind === "message" && Boolean(effectiveSessionId);
                    const openInspector = () => router.push(`/runtime/sessions/${effectiveSessionId}`);
                    return (
                      <div
                        key={entry.id}
                        role={canInspect ? "button" : undefined}
                        tabIndex={canInspect ? 0 : undefined}
                        onClick={canInspect ? openInspector : undefined}
                        onKeyDown={canInspect ? (event) => { if (event.key === "Enter") openInspector(); } : undefined}
                        className={`rounded-panel border px-4 py-3 ${canInspect ? "cursor-pointer hover:border-clinical-blue" : ""} ${
                          entry.kind === "lifecycle"
                            ? "border-border bg-surface-subtle"
                            : entry.speaker === "patient"
                              ? "border-clinical-blue-light bg-clinical-blue-light/50"
                              : entry.speaker === "clinician"
                                ? "border-success bg-success-light/40"
                                : "border-border bg-surface"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-text-muted">
                          <span>{speakerLabel(entry.speaker)}</span>
                          <span>{formatTimestamp(entry.createdAt)}</span>
                        </div>
                        {entry.stepTitle && <div className="mt-1 text-[11px] text-text-muted">{entry.stepTitle}</div>}
                        <StreamingText
                          streamKey={entry.id}
                          text={entry.content}
                          active={!reducedMotion && isNewMessage}
                          className="mt-1 whitespace-pre-wrap break-words text-sm text-text-primary"
                        />
                        {canInspect && <div className="mt-1 text-[11px] text-clinical-blue">{t("patientDetail.audit.viewInspector")}</div>}
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            <Card>
              <SectionHeader title={t("patientDetail.summary.status")} />
              <div className="space-y-3 p-4">
                <SummaryRow label={t("patientDetail.summary.currentSession")} value={findSessionTitle(session?.sessionDefinitionId) ?? t("common.unknown")} />
                <SummaryRow label={t("patientDetail.summary.currentStep")} value={currentNode?.title ?? t("common.unknown")} />
                <SummaryRow label={t("patientDetail.summary.status")} value={t(`patientMonitoring.status.${status}`)} />
                <SummaryRow label={t("patientDetail.summary.progress")} value={String(session?.completedPromptItemIds?.length ?? 0)} />
                <SummaryRow label={t("patientDetail.summary.startedAt")} value={formatTimestamp(session?.startedAt)} />
                <SummaryRow label={t("patientDetail.summary.lastActivity")} value={formatTimestamp(session?.updatedAt ?? participant.updatedAt)} />
                <div className="flex flex-col gap-2 pt-2">
                  <Button variant="secondary" disabled={!canPause || pauseMutation.isPending} onClick={() => pauseMutation.mutate()}>
                    {t("patientDetail.actions.pause")}
                  </Button>
                  <Button variant="secondary" disabled={!canResume || resumeMutation.isPending} onClick={() => resumeMutation.mutate()}>
                    {t("patientDetail.actions.resume")}
                  </Button>
                  <Button variant="danger" disabled={!canEnd || endMutation.isPending} onClick={() => endMutation.mutate()}>
                    {t("patientDetail.actions.end")}
                  </Button>
                  <Button variant="primary" onClick={() => setNoteModalOpen(true)}>
                    {t("patientDetail.actions.addNote")}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        ) : activeTab === "worksheet" ? (
          <div>
            {session && hasWorksheetBindings(session.sessionDefinitionId) ? (
              <WorksheetPane
                runtimeSessionId={effectiveSessionId}
                sessionDefinitionId={session.sessionDefinitionId}
                activeCanonicalFieldKey={sessionViewQuery.data?.currentPromptItem?.outputFields?.[0]}
                variant="clinician"
              />
            ) : (
              <Card>
                <EmptyState title={t("patientDetail.worksheet.unavailable")} description="" />
              </Card>
            )}
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[1fr_.85fr]">
            <Card>
              <SectionHeader title={t("patientDetail.tabs.profile")} />
              <div className="space-y-3 p-4">
                <SummaryRow label={t("patientDetail.profile.participantId")} value={participant.id} />
                <SummaryRow label={t("patientDetail.profile.displayName")} value={participant.alias} />
                <SummaryRow label={t("patientDetail.profile.status")} value={participant.status} />
                <SummaryRow label={t("patientDetail.profile.enrollmentDate")} value={participant.enrollmentDate ? formatTimestamp(participant.enrollmentDate) : t("common.unknown")} />
                <SummaryRow label={t("patientDetail.profile.assignedClinician")} value={participant.assignedClinician ?? t("common.unknown")} />
                <SummaryRow label={t("patientDetail.profile.preferredLanguage")} value={participant.locale} />
                <SummaryRow label={t("patientDetail.profile.currentSession")} value={findSessionTitle(session?.sessionDefinitionId) ?? t("common.unknown")} />
                <SummaryRow label={t("patientDetail.profile.completedSessions")} value={String(summary.completedSessionCount)} />
              </div>
              <SectionHeader title={t("patientDetail.profile.sessionsHeading")} />
              <div className="space-y-2 p-4">
                {sessionProgress.map((item) => {
                  const runs = sessionsByDefinition.get(item.id) ?? [];
                  const header = (
                    <div className="flex items-center justify-between gap-2 rounded-panel border border-border px-3 py-2">
                      <div>
                        <div className="text-xs font-semibold text-text-muted">S{String(item.number).padStart(2, "0")}</div>
                        <div className="text-sm text-text-primary">{item.title}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {runs.length > 0 && (
                          <span className="text-[11px] text-text-muted">{t("patientDetail.profile.runsLabel", { count: runs.length })}</span>
                        )}
                        <Badge tone={STATUS_TONE[item.status]}>{t(`patientMonitoring.status.${item.status}`)}</Badge>
                      </div>
                    </div>
                  );
                  if (runs.length === 0) return <div key={item.id}>{header}</div>;
                  return (
                    <details key={item.id} className="group rounded-panel">
                      <summary className="cursor-pointer list-none">{header}</summary>
                      <div className="mt-1.5 space-y-1.5 pl-3">
                        {runs.map((run) => (
                          <div key={run.id} className="flex items-center justify-between gap-2 rounded-panel border border-dashed border-border px-3 py-1.5">
                            <div>
                              <div className="text-[11px] font-mono text-text-muted">{run.id}</div>
                              <div className="text-xs text-text-secondary">{formatTimestamp(run.updatedAt)}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge tone={STATUS_TONE[runStatus(run)]}>{t(`patientMonitoring.status.${runStatus(run)}`)}</Badge>
                              <Button size="sm" variant="secondary" onClick={() => openSession(run.id, "audit")}>
                                {t("patientDetail.profile.openSession")}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            </Card>

            <div className="space-y-4">
              <HomeworkPanel participantId={participantId} />

              <Card>
                <SectionHeader
                  title={t("patientDetail.profile.notesHeading")}
                  action={
                    <Button size="sm" onClick={() => setNoteModalOpen(true)}>
                      {t("patientDetail.actions.addNote")}
                    </Button>
                  }
                />
                <div className="space-y-3 p-4">
                  <p className="rounded-panel border border-border bg-surface-subtle px-3 py-2 text-xs text-text-secondary">{t("patientDetail.profile.notesNotice")}</p>
                  {clinicianNotes.length === 0 ? (
                    <EmptyState title={t("patientDetail.audit.noEntries")} />
                  ) : (
                    clinicianNotes.map((note) => (
                      <div key={note.id} className="rounded-panel border border-border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-[11px] text-text-muted">{formatTimestamp(note.createdAt)}</div>
                          <button
                            type="button"
                            onClick={() => setNoteToDelete({ id: note.id, content: note.content })}
                            className="shrink-0 text-[11px] font-semibold text-critical hover:underline"
                          >
                            {t("patientDetail.note.delete")}
                          </button>
                        </div>
                        <div className="mt-1 text-sm text-text-primary">{note.content}</div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>

      <Modal open={noteModalOpen} onClose={() => setNoteModalOpen(false)} title={t("patientDetail.actions.addNote")}>
        <div className="space-y-3 p-5">
          <Field label={t("patientDetail.note.label")}>
            <textarea
              className={textareaClass}
              placeholder={t("patientDetail.note.placeholder")}
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setNoteModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button disabled={!noteDraft.trim() || addNoteMutation.isPending} onClick={() => addNoteMutation.mutate(noteDraft.trim())}>
              {t("patientDetail.note.submit")}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmActionDialog
        open={Boolean(noteToDelete)}
        onClose={() => setNoteToDelete(null)}
        onConfirm={() => noteToDelete && deleteNoteMutation.mutate(noteToDelete.id)}
        title={t("patientDetail.note.deleteConfirmTitle")}
        description={noteToDelete?.content ?? ""}
        confirmLabel={t("patientDetail.note.delete")}
        confirmDisabled={deleteNoteMutation.isPending}
      />
    </AppShell>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  // Below 640px this stacks label above value (brief §12 -- the previous
  // unconditional horizontal row let a long ID/title push the value off the
  // right edge of a narrow viewport). At 640px and up, flex-row/items-center/
  // justify-between/gap-3 are the exact same classes this div always had, so
  // desktop/tablet render identically to before.
  return (
    <div className="flex flex-col gap-0.5 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <span className="text-text-secondary">{label}</span>
      <span className="min-w-0 break-words font-semibold text-text-primary">{value}</span>
    </div>
  );
}
