"use client";

import { SCORE_SCALE_COLORS, WorksheetCell } from "@/components/runtime/worksheet-renderers/shared";
import { useReducedMotionPreference } from "@/lib/motion/use-reduced-motion-preference";
import type { WorksheetFieldView, WorksheetView } from "@/types/worksheet";

// Recreates the TBCT Session 6 Color-Coded Symptoms Hierarchy (CCSH): a
// severity-ordered list of situations (0-5, same color scale as S02's
// hierarchies, but drawn here as left-border bars rather than chips to
// keep this figure visually distinct), the green-only homework selection,
// and the safety-behavior/underlying-assumption circuit box.

export function S06Worksheet({
  view,
  activeCanonicalFieldKey,
  onConfirm,
  onEdit,
  busy,
}: {
  view: WorksheetView;
  activeCanonicalFieldKey?: string;
  onConfirm: (worksheetFieldKey: string) => void;
  onEdit: (worksheetFieldKey: string, value: unknown) => void;
  busy: boolean;
}) {
  const reducedMotion = Boolean(useReducedMotionPreference());
  const byKey = new Map(view.fields.map((field) => [field.binding.worksheetFieldKey, field]));
  const get = (key: string) => byKey.get(key);
  const isActive = (field?: WorksheetFieldView) => Boolean(field && field.binding.canonicalFieldKey === activeCanonicalFieldKey);

  return (
    <div className="space-y-5 rounded-panel border border-border bg-[linear-gradient(180deg,var(--surface)_0%,var(--surface-subtle)_100%)] p-4 sm:p-6">
      <SymptomHierarchy itemsField={get("symptomItems")} scoresField={get("symptomItemScores")} active={isActive(get("symptomItems")) || isActive(get("symptomItemScores"))} onConfirm={onConfirm} />

      <div className="rounded-panel border-2 border-success/40 bg-success-light/15 p-3 sm:p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
          <div className="text-xs font-semibold uppercase tracking-[0.06em] text-text-muted">This week&apos;s practice — green items only</div>
        </div>
        <WorksheetCell field={get("greenHomeworkItems")} q="—" label="Chosen items" list borderless active={isActive(get("greenHomeworkItems"))} onConfirm={onConfirm} onEdit={onEdit} busy={busy} reducedMotion={reducedMotion} />
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <WorksheetCell field={get("accountabilityPartner")} q="—" label="Accountability partner" compact borderless active={isActive(get("accountabilityPartner"))} onConfirm={onConfirm} onEdit={onEdit} busy={busy} reducedMotion={reducedMotion} />
          <WorksheetCell field={get("fallbackPlan")} q="—" label="Plan B" compact borderless active={isActive(get("fallbackPlan"))} onConfirm={onConfirm} onEdit={onEdit} busy={busy} reducedMotion={reducedMotion} />
        </div>
      </div>

      <div className="rounded-panel border border-border bg-surface p-3 sm:p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-text-muted">The safety-behavior circuit</div>
        <WorksheetCell field={get("safetyBehaviors")} q="—" label="Safety behaviors I've noticed" list active={isActive(get("safetyBehaviors"))} onConfirm={onConfirm} onEdit={onEdit} busy={busy} reducedMotion={reducedMotion} />
        <div className="mt-2">
          <WorksheetCell field={get("underlyingAssumption")} q="—" label={'My underlying assumption ("If... then...")'} active={isActive(get("underlyingAssumption"))} onConfirm={onConfirm} onEdit={onEdit} busy={busy} reducedMotion={reducedMotion} />
        </div>
      </div>

      <div className="rounded-panel border-2 border-clinical-blue/40 bg-clinical-blue-light/20 p-1">
        <WorksheetCell field={get("circuitTwoSummary")} q="—" label="My summary" borderless active={isActive(get("circuitTwoSummary"))} onConfirm={onConfirm} onEdit={onEdit} busy={busy} reducedMotion={reducedMotion} />
      </div>
    </div>
  );
}

function SymptomHierarchy({
  itemsField,
  scoresField,
  active,
  onConfirm,
}: {
  itemsField?: WorksheetFieldView;
  scoresField?: WorksheetFieldView;
  active: boolean;
  onConfirm: (worksheetFieldKey: string) => void;
}) {
  if (!itemsField || !scoresField) return null;
  const items = Array.isArray(itemsField.value?.value) ? (itemsField.value?.value as unknown[]) : [];
  const scores = Array.isArray(scoresField.value?.value) ? (scoresField.value?.value as unknown[]) : [];
  const filled = items.length > 0;
  const draftPending = itemsField.value?.status === "draft_extracted" || scoresField.value?.status === "draft_extracted";

  return (
    <div className={`rounded-panel border p-3 sm:p-4 transition ${active ? "ring-2 ring-clinical-blue border-clinical-blue" : "border-border bg-surface"} ${!filled ? "border-dashed opacity-70" : ""}`}>
      <div className="mb-3 text-sm font-semibold text-text-primary">Symptom Hierarchy</div>
      {filled ? (
        <ul className="space-y-1.5">
          {items.map((item, index) => {
            const score = scores[index] !== undefined ? Number(scores[index]) : null;
            const color = score !== null && score >= 0 && score <= 5 ? SCORE_SCALE_COLORS[score] : "var(--border)";
            return (
              <li key={index} className="flex items-center gap-2.5 rounded-panel border border-border bg-surface-subtle py-1.5 pl-0 pr-2.5" style={{ borderLeft: `4px solid ${color}` }}>
                <span className="pl-2.5 text-sm text-text-primary">{String(item)}</span>
                <span className="ml-auto text-xs font-semibold text-text-muted">{score ?? "?"}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="text-sm text-text-muted">&hellip;</div>
      )}
      {draftPending && (
        <button
          type="button"
          className="mt-2 rounded-panel border border-clinical-blue px-3 py-1 text-xs font-semibold text-clinical-blue"
          onClick={() => { onConfirm(itemsField.definition.worksheetFieldKey); onConfirm(scoresField.definition.worksheetFieldKey); }}
        >
          Confirm
        </button>
      )}
    </div>
  );
}
