"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpDown, Search } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge, Card, EmptyState, PageHeader, PageSkeleton, inputClass } from "@/components/ui/primitives";
import { useT } from "@/lib/i18n/context";
import { listRuntimeParticipants } from "@/lib/api/participant-api";
import { listRuntimeSessions } from "@/lib/api/runtime-session-api";
import { getSafetyEvents } from "@/lib/api/safety-operations-api";
import { cn } from "@/lib/utils";
import {
  findSessionTitle,
  findStepTitle,
  summarizeParticipant,
  type MonitoringStatus,
  type ParticipantMonitoringSummary,
} from "@/components/pages/patient-monitoring/patient-monitoring-utils";
import type { RuntimeParticipant } from "@/types/longitudinal-memory";

const STATUS_TONE: Record<MonitoringStatus, "primary" | "warning" | "critical" | "success" | "neutral"> = {
  inProgress: "primary",
  paused: "warning",
  needsReview: "critical",
  completed: "success",
  notStarted: "neutral",
};

function formatTimestamp(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function PatientListPage() {
  const { t } = useT();
  const participantsQuery = useQuery({ queryKey: ["patient-monitoring-participants"], queryFn: listRuntimeParticipants });
  const sessionsQuery = useQuery({ queryKey: ["patient-monitoring-sessions"], queryFn: listRuntimeSessions });
  const safetyQuery = useQuery({ queryKey: ["patient-monitoring-safety-events"], queryFn: getSafetyEvents });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | MonitoringStatus>("all");
  const [sessionFilter, setSessionFilter] = useState<"all" | string>("all");
  const [sortDescending, setSortDescending] = useState(true);

  const isLoading = participantsQuery.isLoading || sessionsQuery.isLoading || safetyQuery.isLoading;

  const rows = useMemo(() => {
    const participants = participantsQuery.data ?? [];
    const sessions = sessionsQuery.data ?? [];
    const safetyEvents = safetyQuery.data ?? [];
    return participants.map((participant) => ({
      participant,
      summary: summarizeParticipant(participant.id, sessions, safetyEvents, participant.updatedAt),
    }));
  }, [participantsQuery.data, sessionsQuery.data, safetyQuery.data]);

  const sessionOptions = useMemo(() => {
    const ids = new Set<string>();
    rows.forEach(({ summary }) => {
      if (summary.currentSession?.sessionDefinitionId) ids.add(summary.currentSession.sessionDefinitionId);
    });
    return Array.from(ids);
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows
      .filter(({ participant }) => {
        if (!query) return true;
        return participant.alias.toLowerCase().includes(query) || participant.id.toLowerCase().includes(query);
      })
      .filter(({ summary }) => statusFilter === "all" || summary.monitoringStatus === statusFilter)
      .filter(({ summary }) => sessionFilter === "all" || summary.currentSession?.sessionDefinitionId === sessionFilter)
      .sort((left, right) => {
        const leftTime = left.summary.lastActivity ?? "";
        const rightTime = right.summary.lastActivity ?? "";
        return sortDescending ? rightTime.localeCompare(leftTime) : leftTime.localeCompare(rightTime);
      });
  }, [rows, search, statusFilter, sessionFilter, sortDescending]);

  const summaryCounts = useMemo(() => {
    const counts: Record<MonitoringStatus, number> = { inProgress: 0, paused: 0, needsReview: 0, completed: 0, notStarted: 0 };
    rows.forEach(({ summary }) => {
      counts[summary.monitoringStatus] += 1;
    });
    return counts;
  }, [rows]);

  if (isLoading) return <AppShell><PageSkeleton /></AppShell>;

  return (
    <AppShell>
      <PageHeader eyebrow="Clinician" title={t("patientMonitoring.title")} description="Caseload overview across active, paused, and completed protocol sessions." />
      <div className="space-y-4 p-4 lg:p-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryStat label={t("patientMonitoring.summary.inProgress")} value={summaryCounts.inProgress} tone="primary" />
          <SummaryStat label={t("patientMonitoring.summary.paused")} value={summaryCounts.paused} tone="warning" />
          <SummaryStat label={t("patientMonitoring.summary.needsReview")} value={summaryCounts.needsReview} tone="critical" />
          <SummaryStat label={t("patientMonitoring.summary.completed")} value={summaryCounts.completed} tone="success" />
        </div>

        <Card className="p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                className={cn(inputClass, "pl-9")}
                placeholder={t("patientMonitoring.search")}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <select className={cn(inputClass, "lg:w-48")} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} aria-label={t("patientMonitoring.statusFilter")}>
              <option value="all">{t("common.all")}</option>
              <option value="inProgress">{t("patientMonitoring.status.inProgress")}</option>
              <option value="paused">{t("patientMonitoring.status.paused")}</option>
              <option value="needsReview">{t("patientMonitoring.status.needsReview")}</option>
              <option value="completed">{t("patientMonitoring.status.completed")}</option>
              <option value="notStarted">{t("patientMonitoring.status.notStarted")}</option>
            </select>
            <select className={cn(inputClass, "lg:w-56")} value={sessionFilter} onChange={(event) => setSessionFilter(event.target.value)} aria-label={t("patientMonitoring.sessionFilter")}>
              <option value="all">{t("common.all")}</option>
              {sessionOptions.map((id) => (
                <option key={id} value={id}>{findSessionTitle(id) ?? id}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setSortDescending((value) => !value)}
              className="inline-flex h-9 items-center gap-2 rounded-panel border border-border bg-surface px-3 text-xs font-medium text-text-secondary hover:bg-surface-hover lg:w-56"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {t("patientMonitoring.sortByLastActivity")}
            </button>
          </div>
        </Card>

        {!filteredRows.length ? (
          <Card><EmptyState title="No participants match the current filters" /></Card>
        ) : (
          <>
            {/* Wide screens: table */}
            <Card className="hidden overflow-hidden lg:block">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-surface-subtle text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                  <tr>
                    <th className="px-4 py-3">{t("patientMonitoring.columns.participant")}</th>
                    <th className="px-4 py-3">{t("patientMonitoring.columns.currentSession")}</th>
                    <th className="px-4 py-3">{t("patientMonitoring.columns.currentStep")}</th>
                    <th className="px-4 py-3">{t("patientMonitoring.columns.status")}</th>
                    <th className="px-4 py-3">{t("patientMonitoring.columns.lastActivity")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(({ participant, summary }) => (
                    <ParticipantRow key={participant.id} participant={participant} summary={summary} t={t} />
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Narrow screens: stacked cards */}
            <div className="grid gap-3 lg:hidden">
              {filteredRows.map(({ participant, summary }) => (
                <Link key={participant.id} href={`/patients/${participant.id}`}>
                  <Card className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-text-primary">{participant.alias}</div>
                      <Badge tone={STATUS_TONE[summary.monitoringStatus]}>{t(`patientMonitoring.status.${summary.monitoringStatus}`)}</Badge>
                    </div>
                    <div className="mt-2 text-xs text-text-secondary">{findSessionTitle(summary.currentSession?.sessionDefinitionId) ?? "—"}</div>
                    <div className="mt-1 text-xs text-text-secondary">{findStepTitle(summary.currentSession?.currentNodeId) ?? "—"}</div>
                    <div className="mt-2 text-[11px] text-text-muted">{formatTimestamp(summary.lastActivity)}</div>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: number; tone: "primary" | "warning" | "critical" | "success" }) {
  return (
    <Card className="p-4">
      <Badge tone={tone}>{label}</Badge>
      <div className="mt-3 text-2xl font-semibold text-text-primary">{value}</div>
    </Card>
  );
}

function ParticipantRow({
  participant,
  summary,
  t,
}: {
  participant: RuntimeParticipant;
  summary: ParticipantMonitoringSummary;
  t: ReturnType<typeof useT>["t"];
}) {
  return (
    <tr className="border-b border-border last:border-0 hover:bg-surface-subtle">
      <td className="px-4 py-3">
        <Link href={`/patients/${participant.id}`} className="font-medium text-clinical-blue hover:underline">
          {participant.alias}
        </Link>
        <div className="text-[11px] text-text-muted">{participant.id}</div>
      </td>
      <td className="px-4 py-3 text-text-secondary">{findSessionTitle(summary.currentSession?.sessionDefinitionId) ?? "—"}</td>
      <td className="px-4 py-3 text-text-secondary">{findStepTitle(summary.currentSession?.currentNodeId) ?? "—"}</td>
      <td className="px-4 py-3"><Badge tone={STATUS_TONE[summary.monitoringStatus]}>{t(`patientMonitoring.status.${summary.monitoringStatus}`)}</Badge></td>
      <td className="px-4 py-3 text-text-secondary">{formatTimestamp(summary.lastActivity)}</td>
    </tr>
  );
}
