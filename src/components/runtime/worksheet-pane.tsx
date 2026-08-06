"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Card, SectionHeader } from "@/components/ui/primitives";
import { confirmWorksheetField, editWorksheetField, getWorksheetView } from "@/lib/worksheet/worksheet-projection";
import type { WorksheetFieldStatus, WorksheetFieldView } from "@/types/worksheet";

// The interactive visual worksheet -- a typed projection of
// RuntimeContext.fields (see src/lib/worksheet/worksheet-projection.ts for
// the write-path contract). This is the pilot renderer for one session
// (bindings registered in worksheet-binding-registry.ts); it renders
// whatever fields are bound generically rather than a hand-drawn per-
// session layout, so it works for any session added to the registry later.

const STATUS_TONE: Record<WorksheetFieldStatus, "success" | "primary" | "neutral" | "warning" | "critical"> = {
  empty: "neutral",
  active: "primary",
  draft_extracted: "warning",
  shown_to_participant: "warning",
  participant_confirmed: "success",
  participant_edited: "primary",
  not_applicable: "neutral",
  clinician_review_required: "critical",
  locked: "neutral",
};

const STATUS_LABEL: Record<WorksheetFieldStatus, string> = {
  empty: "Not yet reached",
  active: "In progress",
  draft_extracted: "Draft — needs your confirmation",
  shown_to_participant: "Shown to you",
  participant_confirmed: "Confirmed",
  participant_edited: "Edited by you",
  not_applicable: "Not applicable",
  clinician_review_required: "Needs clinician review",
  locked: "Locked",
};

export function WorksheetPane({ runtimeSessionId, sessionDefinitionId, activeCanonicalFieldKey }: { runtimeSessionId: string; sessionDefinitionId: string; activeCanonicalFieldKey?: string }) {
  const queryClient = useQueryClient();
  const queryKey = ["worksheet-view", runtimeSessionId];
  const worksheetQuery = useQuery({
    queryKey,
    queryFn: () => getWorksheetView(runtimeSessionId, sessionDefinitionId),
    refetchInterval: 4000,
  });

  const confirmMutation = useMutation({
    mutationFn: (worksheetFieldKey: string) => confirmWorksheetField(runtimeSessionId, sessionDefinitionId, worksheetFieldKey),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
  const editMutation = useMutation({
    mutationFn: ({ worksheetFieldKey, value }: { worksheetFieldKey: string; value: unknown }) => editWorksheetField(runtimeSessionId, sessionDefinitionId, worksheetFieldKey, value),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const view = worksheetQuery.data;
  if (!view) return null;

  return (
    <Card className="overflow-hidden">
      <SectionHeader title="Session Worksheet" description="Fills in as you answer -- confirm a box once it looks right, or edit it." />
      <div className="max-h-[calc(100vh-260px)] space-y-2 overflow-auto p-4">
        {view.fields.map((field) => (
          <WorksheetFieldRow
            key={field.definition.id}
            field={field}
            isActive={field.binding.canonicalFieldKey === activeCanonicalFieldKey}
            onConfirm={() => confirmMutation.mutate(field.definition.worksheetFieldKey)}
            onEdit={(value) => editMutation.mutate({ worksheetFieldKey: field.definition.worksheetFieldKey, value })}
            busy={confirmMutation.isPending || editMutation.isPending}
          />
        ))}
      </div>
    </Card>
  );
}

function WorksheetFieldRow({ field, isActive, onConfirm, onEdit, busy }: { field: WorksheetFieldView; isActive: boolean; onConfirm: () => void; onEdit: (value: unknown) => void; busy: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(field.value?.displayValue ?? "");
  const status = field.value?.status ?? "empty";
  const filled = field.value !== null && field.value.value !== undefined && field.value.value !== "";

  return (
    <div className={`rounded-panel border p-3 transition ${isActive ? "border-clinical-blue bg-clinical-blue-light/40 ring-1 ring-clinical-blue" : filled ? "border-border bg-surface" : "border-dashed border-border bg-surface-subtle/60"}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-[0.06em] text-text-muted">{field.binding.label}</div>
        <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
      </div>
      {field.binding.sourceSection && <div className="mt-0.5 text-[10px] text-text-muted">{field.binding.sourceSection}</div>}

      {editing ? (
        <div className="mt-2 space-y-2">
          <textarea className="w-full rounded-panel border border-border bg-surface px-2 py-1.5 text-sm" rows={2} value={draft} onChange={(event) => setDraft(event.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={() => { onEdit(field.binding.valueType === "percentage" || field.binding.valueType === "integer" ? Number(draft) : draft); setEditing(false); }}>Save</Button>
            <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : filled ? (
        <>
          {field.binding.valueType === "percentage" ? (
            <div className="mt-2 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-subtle">
                <div className="h-full rounded-full bg-clinical-blue transition-all" style={{ width: `${Math.max(0, Math.min(100, Number(field.value?.value) || 0))}%` }} />
              </div>
              <span className="text-sm font-semibold text-text-primary">{field.value?.displayValue}%</span>
            </div>
          ) : field.binding.valueType === "text_list" ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(Array.isArray(field.value?.value) ? (field.value?.value as unknown[]) : []).map((item, index) => (
                <span key={index} className="rounded-full border border-border bg-surface-subtle px-2 py-0.5 text-xs text-text-primary">{String(item)}</span>
              ))}
            </div>
          ) : (
            <div className="mt-1 whitespace-pre-wrap break-words text-sm text-text-primary">{field.value?.displayValue}</div>
          )}
          <div className="mt-2 flex gap-2">
            {status === "draft_extracted" && (
              <Button size="sm" onClick={onConfirm} disabled={busy}>Confirm</Button>
            )}
            {field.binding.participantOwned && (
              <Button size="sm" variant="secondary" onClick={() => { setDraft(field.value?.displayValue ?? ""); setEditing(true); }} disabled={busy}>Edit</Button>
            )}
          </div>
        </>
      ) : (
        <div className="mt-1 text-sm text-text-muted">—</div>
      )}
    </div>
  );
}
