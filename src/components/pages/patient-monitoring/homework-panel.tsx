"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge, Button, Card, EmptyState, Modal, PageSkeleton, SectionHeader } from "@/components/ui/primitives";
import { useT } from "@/lib/i18n/context";
import { listHomeworkEntries, listHomeworkRecordsByParticipant } from "@/lib/repositories/homework-repository";
import { HOMEWORK_CATEGORY_BY_SESSION, HOMEWORK_LABEL_BY_SESSION, type HomeworkEntryRecord, type HomeworkRecord, type HomeworkStatus } from "@/types/homework";

// The clinician-facing counterpart to the patient homework pages
// (src/components/pages/homework/s0N-*.tsx) -- read-only, one row per
// completed session with a follow-up activity. Follows the same
// Card + SectionHeader + row-list pattern as the "Clinical notes" panel
// right next to it in patient-detail-page.tsx.

const STATUS_TONE: Record<HomeworkStatus, "primary" | "warning" | "critical" | "success" | "neutral"> = {
  not_started: "neutral",
  in_progress: "primary",
  ongoing: "primary",
  review_available: "warning",
  completed: "success",
};

function formatTimestamp(value?: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString();
}

/** "candidateOneEmotion" -> "Candidate one emotion" -- for rendering an
 * untyped homework data/entry payload's own keys as row labels, without a
 * per-session-specific renderer (each session's homework module owns its
 * own shape; see types/homework.ts's header). */
function humanizeKey(key: string) {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, (char) => char.toUpperCase());
  return spaced;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.map((item) => formatValue(item)).join(", ") : "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function DataFields({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);
  if (!entries.length) return null;
  return (
    <div className="space-y-1.5">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-start justify-between gap-3 text-sm">
          <span className="shrink-0 text-text-secondary">{humanizeKey(key)}</span>
          <span className="text-right font-medium text-text-primary">{formatValue(value)}</span>
        </div>
      ))}
    </div>
  );
}

export function HomeworkPanel({ participantId }: { participantId: string }) {
  const { t } = useT();
  const [openRecord, setOpenRecord] = useState<HomeworkRecord | null>(null);

  const recordsQuery = useQuery({
    queryKey: ["patient-monitoring-homework", participantId],
    queryFn: () => listHomeworkRecordsByParticipant(participantId),
    enabled: Boolean(participantId),
  });
  const records = recordsQuery.data ?? [];

  const entriesQuery = useQuery({
    queryKey: ["patient-monitoring-homework-entries", openRecord?.id],
    queryFn: () => listHomeworkEntries(openRecord!.id),
    enabled: Boolean(openRecord && HOMEWORK_CATEGORY_BY_SESSION[openRecord.sessionDefinitionId] === "ongoing"),
  });

  return (
    <>
      <Card>
        <SectionHeader title={t("patientDetail.profile.homeworkHeading")} />
        <div className="space-y-2 p-4">
          {recordsQuery.isLoading ? (
            <PageSkeleton />
          ) : records.length === 0 ? (
            <EmptyState title={t("patientDetail.homework.empty")} description="" />
          ) : (
            records.map((record) => (
              <div key={record.id} className="flex items-center justify-between gap-3 rounded-panel border border-border px-3 py-2">
                <div>
                  <div className="text-xs font-semibold text-text-muted">S{record.sessionDefinitionId.slice(-2)}</div>
                  <div className="text-sm text-text-primary">{HOMEWORK_LABEL_BY_SESSION[record.sessionDefinitionId] ?? record.sessionDefinitionId}</div>
                  <div className="mt-0.5 text-[11px] text-text-muted">
                    {t("patientDetail.homework.lastUpdated")}: {formatTimestamp(record.updatedAt)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={STATUS_TONE[record.status]}>{t(`patientDetail.homework.status.${record.status}`)}</Badge>
                  <Button size="sm" variant="secondary" onClick={() => setOpenRecord(record)}>
                    {t("patientDetail.homework.view")}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Modal
        open={Boolean(openRecord)}
        onClose={() => setOpenRecord(null)}
        title={t("patientDetail.homework.modalTitle", { session: openRecord ? HOMEWORK_LABEL_BY_SESSION[openRecord.sessionDefinitionId] ?? openRecord.sessionDefinitionId : "" })}
      >
        {openRecord && (
          <div className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <Badge tone={STATUS_TONE[openRecord.status]}>{t(`patientDetail.homework.status.${openRecord.status}`)}</Badge>
              <span className="text-xs text-text-muted">
                {t("patientDetail.homework.lastUpdated")}: {formatTimestamp(openRecord.updatedAt)}
              </span>
            </div>
            <DataFields data={openRecord.data} />

            {HOMEWORK_CATEGORY_BY_SESSION[openRecord.sessionDefinitionId] === "ongoing" && (
              <div className="space-y-2 border-t border-border pt-3">
                <div className="text-xs font-semibold uppercase tracking-[0.06em] text-text-muted">{t("patientDetail.homework.entries")}</div>
                {entriesQuery.isLoading ? (
                  <PageSkeleton />
                ) : !entriesQuery.data?.length ? (
                  <p className="text-sm text-text-muted">{t("patientDetail.homework.noEntries")}</p>
                ) : (
                  <div className="space-y-2">
                    {entriesQuery.data.map((entry: HomeworkEntryRecord) => (
                      <div key={entry.id} className="rounded-panel border border-border bg-surface-subtle p-3">
                        <div className="mb-1.5 text-[11px] text-text-muted">{formatTimestamp(entry.createdAt)}</div>
                        <DataFields data={entry.data} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
