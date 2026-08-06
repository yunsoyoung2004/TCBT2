"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { StreamingText } from "@/components/runtime/streaming-text";
import { useReducedMotionPreference } from "@/lib/motion/use-reduced-motion-preference";
import {
  Badge,
  Button,
  Card,
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
import { addClinicianNote, getClinicianNotes } from "@/lib/api/longitudinal-memory-api";
import { getSafetyEvents } from "@/lib/api/safety-operations-api";
import {
  findSessionTitle,
  findStepTitle,
  summarizeParticipant,
  type MonitoringStatus,
} from "@/components/pages/patient-monitoring/patient-monitoring-utils";
import type { RuntimeMessageRole } from "@/types/runtime-session";

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
}

export function PatientMonitoringDetailPage() {
  const { t } = useT();
  const params = useParams<{ participantId?: string | string[] }>();
  const pathname = usePathname();
  const participantId =
    (Array.isArray(params?.participantId) ? params.participantId[0] : params?.participantId) ??
    pathname.split("/").filter(Boolean).at(-1) ??
    "";

  const queryClient = useQueryClient();
  const reducedMotion = useReducedMotionPreference();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [auditFilter, setAuditFilter] = useState<AuditFilter>("all");
  const [activeTab, setActiveTab] = useState<"audit" | "profile">("audit");
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  const participantQuery = useQuery({
    queryKey: ["patient-monitoring-participant", participantId],
    queryFn: () => getRuntimeParticipant(participantId),
    enabled: Boolean(participantId),
  });

  const participant = participantQuery.data;
  const sessionIds = participant?.runtimeSessionIds ?? [];
  const effectiveSessionId = selectedSessionId ?? sessionIds.at(-1) ?? "";

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

  const safetyQuery = useQuery({
    queryKey: ["patient-monitoring-safety-events", participantId],
    queryFn: getSafetyEvents,
    enabled: Boolean(participantId),
  });

  const canonicalSessionsQuery = useQuery({ queryKey: ["patient-monitoring-canonical-sessions"], queryFn: listCanonicalTestSessions });

  const allRuntimeSessionsQuery = useQuery({ queryKey: ["patient-monitoring-sessions"], queryFn: listRuntimeSessions });

  const summary = useMemo(
    () => summarizeParticipant(participantId, allRuntimeSessionsQuery.data ?? [], safetyQuery.data ?? [], participant?.updatedAt),
    [participantId, allRuntimeSessionsQuery.data, safetyQuery.data, participant?.updatedAt],
  );

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
      />

      <div className="border-b border-border bg-surface px-4 lg:px-6">
        <div className="flex gap-2 py-2 sm:hidden">
          <select className={inputClass} value={activeTab} onChange={(event) => setActiveTab(event.target.value as "audit" | "profile")}>
            <option value="audit">{t("patientDetail.tabs.auditLog")}</option>
            <option value="profile">{t("patientDetail.tabs.profile")}</option>
          </select>
        </div>
        <div className="hidden gap-1 pt-2 sm:flex">
          {(["audit", "profile"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-t-panel border-b-2 px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab ? "border-clinical-blue text-clinical-blue" : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab === "audit" ? t("patientDetail.tabs.auditLog") : t("patientDetail.tabs.profile")}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 p-4 lg:p-6">
        {sessionIds.length > 1 && (
          <Field label={t("patientDetail.sessionSelector")}>
            <select className={inputClass} value={effectiveSessionId} onChange={(event) => setSelectedSessionId(event.target.value)}>
              {sessionIds.map((id) => (
                <option key={id} value={id}>
                  {id}
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
                    return (
                      <div
                        key={entry.id}
                        className={`rounded-panel border px-4 py-3 ${
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
                {sessionProgress.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-panel border border-border px-3 py-2">
                    <div>
                      <div className="text-xs font-semibold text-text-muted">S{String(item.number).padStart(2, "0")}</div>
                      <div className="text-sm text-text-primary">{item.title}</div>
                    </div>
                    <Badge tone={STATUS_TONE[item.status]}>{t(`patientMonitoring.status.${item.status}`)}</Badge>
                  </div>
                ))}
              </div>
            </Card>

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
                      <div className="text-[11px] text-text-muted">{formatTimestamp(note.createdAt)}</div>
                      <div className="mt-1 text-sm text-text-primary">{note.content}</div>
                    </div>
                  ))
                )}
              </div>
            </Card>
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
    </AppShell>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-text-secondary">{label}</span>
      <span className="font-semibold text-text-primary">{value}</span>
    </div>
  );
}
