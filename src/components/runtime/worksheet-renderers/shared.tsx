"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Badge, Button } from "@/components/ui/primitives";
import { fadeScale, fadeUp, highlightPulse, questComplete } from "@/lib/motion/motion-variants";
import type { WorksheetFieldView } from "@/types/worksheet";

// How long the one-shot "just filled" flourish stays flagged -- matches
// questComplete's own animation duration (motion-variants.ts) so the badge
// has fully faded out before this flips back off.
const JUST_FILLED_MS = 1300;

/** Detects a field's one-shot false->true "just got filled" transition, not
 * "is filled" (which callers already compute themselves) -- so the "quest
 * complete" flourish plays exactly once per fill instead of replaying on
 * every unrelated re-render/poll while the field stays filled. A field that
 * is already filled on first mount (e.g. reopening a session mid-way
 * through) never triggers it -- only a live false->true flip does. */
export function useJustFilled(filled: boolean, reducedMotion: boolean) {
  const previousRef = useRef(filled);
  const [justFilled, setJustFilled] = useState(false);
  useEffect(() => {
    const wasFilled = previousRef.current;
    previousRef.current = filled;
    if (reducedMotion || !filled || wasFilled) return undefined;
    setJustFilled(true);
    const timeout = setTimeout(() => setJustFilled(false), JUST_FILLED_MS);
    return () => clearTimeout(timeout);
  }, [filled, reducedMotion]);
  return justFilled;
}

/** The "quest complete" badge itself -- a small overlay, not a layout
 * element, so callers just need `position: relative` on the cell shell. */
export function QuestCompleteBadge() {
  return (
    <motion.span
      className="pointer-events-none absolute -right-2 -top-2 z-10 inline-flex items-center gap-1 rounded-full border border-success bg-success-light px-2 py-0.5 text-[11px] font-semibold text-success shadow-sm"
      variants={questComplete}
      initial="initial"
      animate="animate"
    >
      <CheckCircle2 className="h-3 w-3" />
      Filled
    </motion.span>
  );
}

// Small generic building blocks shared across the per-session composed
// worksheets (s01-worksheet.tsx .. s08-worksheet.tsx). These are UI atoms,
// not figure layouts -- each session file arranges them into its own
// bespoke structure matching that session's own manual figure; nothing
// about *which* fields appear, in *what* arrangement, is shared.

export function CycleArrow({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div className="hidden items-center justify-center sm:flex" aria-hidden>
      <motion.svg width="28" height="16" viewBox="0 0 28 16" variants={reducedMotion ? undefined : fadeScale} initial={reducedMotion ? false : "initial"} animate={reducedMotion ? undefined : "animate"}>
        <line x1="1" y1="8" x2="22" y2="8" stroke="currentColor" strokeWidth="1.5" className="text-text-muted" />
        <path d="M22 8 L16 4 M22 8 L16 12" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-text-muted" />
      </motion.svg>
    </div>
  );
}

export function ArrowDown({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <motion.svg width="16" height="24" viewBox="0 0 16 24" variants={reducedMotion ? undefined : fadeScale} initial={reducedMotion ? false : "initial"} animate={reducedMotion ? undefined : "animate"}>
      <line x1="8" y1="1" x2="8" y2="18" stroke="currentColor" strokeWidth="1.5" className="text-text-muted" />
      <path d="M8 18 L4 12 M8 18 L12 12" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-text-muted" />
    </motion.svg>
  );
}

/** 0-5 color scale used by both S02's problem/goal hierarchies and S06's
 * symptom hierarchy -- the same clinical severity palette, per source. */
export const SCORE_SCALE_COLORS = ["#bfdbfe", "#1d4ed8", "#bbf7d0", "#15803d", "#facc15", "#dc2626"] as const;
export const SCORE_SCALE_TEXT = ["#1e3a8a", "#ffffff", "#14532d", "#ffffff", "#3f2d00", "#ffffff"] as const;

export function ScoreChip({ score }: { score: number | null }) {
  if (score === null || Number.isNaN(score) || score < 0 || score > 5) {
    return <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-border text-[11px] text-text-muted">?</span>;
  }
  return (
    <span
      className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: SCORE_SCALE_COLORS[score], color: SCORE_SCALE_TEXT[score] }}
    >
      {score}
    </span>
  );
}

/** A fixed set of choice pills (e.g. "same / a little better / much
 * better") with the field's current value highlighted -- the figure
 * prints these as checkboxes; each session supplies its own option set. */
export function ChoicePills({ field, options, label, active }: { field?: WorksheetFieldView; options: Array<{ value: string; label: string }>; label: string; active: boolean }) {
  const current = field?.value?.value;
  return (
    <div className={`rounded-panel p-2 transition ${active ? "ring-2 ring-clinical-blue" : ""}`}>
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-text-muted">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <span key={option.value} className={`rounded-full border px-3 py-1 text-sm ${current === option.value ? "border-success bg-success-light text-text-primary" : "border-border bg-surface-subtle text-text-secondary"}`}>
            {option.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function WorksheetCell({
  field,
  q,
  gauge,
  gaugeQ,
  active,
  onConfirm,
  onEdit,
  busy,
  reducedMotion,
  compact,
  chip,
  list,
  emphasized,
  borderless,
  label,
  tone,
}: {
  field?: WorksheetFieldView;
  q: string;
  gauge?: WorksheetFieldView;
  gaugeQ?: string;
  active: boolean;
  onConfirm: (worksheetFieldKey: string) => void;
  onEdit: (worksheetFieldKey: string, value: unknown) => void;
  busy: boolean;
  reducedMotion: boolean;
  compact?: boolean;
  chip?: boolean;
  list?: boolean;
  emphasized?: boolean;
  borderless?: boolean;
  label?: string;
  tone?: "neutral";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(field?.value?.displayValue ?? "");
  const filled = Boolean(field) && field!.value !== null && field!.value.value !== undefined && field!.value.value !== "";
  const justFilled = useJustFilled(filled, reducedMotion);
  if (!field) return null;
  const confirmed = field.value?.status === "participant_confirmed";
  const draftPending = field.value?.status === "draft_extracted";

  const shell = `relative rounded-panel p-3 transition ${borderless ? "" : `border ${emphasized ? "border-warning/50 bg-warning-light/15" : tone === "neutral" ? "border-border bg-surface" : "border-border bg-surface"}`} ${active ? "ring-2 ring-clinical-blue border-clinical-blue" : justFilled ? "ring-2 ring-success border-success" : ""} ${!filled ? "border-dashed opacity-70" : ""}`;

  const cellVariants = active ? highlightPulse : fadeUp;
  return (
    <motion.div className={shell} variants={reducedMotion ? undefined : cellVariants} initial={reducedMotion ? false : "initial"} animate={reducedMotion ? undefined : "animate"}>
      {justFilled && <QuestCompleteBadge />}
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-muted">{label ?? `Q${q}`}</div>
        {confirmed && <Badge tone="success">confirmed</Badge>}
      </div>
      {editing ? (
        <div className="mt-2 space-y-2">
          <textarea className="w-full rounded-panel border border-border bg-surface px-2 py-1.5 text-sm" rows={list ? 3 : 2} value={draft} onChange={(event) => setDraft(event.target.value)} />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={busy}
              onClick={() => {
                const nextValue = list ? draft.split("\n").map((line) => line.trim()).filter(Boolean) : draft;
                onEdit(field.definition.worksheetFieldKey, nextValue);
                setEditing(false);
              }}
            >
              Save
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : filled ? (
        <>
          {list ? (
            <ul className="mt-1 space-y-1">
              {(Array.isArray(field.value?.value) ? (field.value?.value as unknown[]) : []).map((item, index) => (
                <li key={index} className="rounded-panel border border-border bg-surface-subtle px-2 py-1 text-sm text-text-primary">{String(item)}</li>
              ))}
            </ul>
          ) : chip ? (
            <div className="mt-1 inline-block rounded-full border border-border bg-surface-subtle px-3 py-1 font-serif text-sm text-text-primary">{field.value?.displayValue}</div>
          ) : (
            <div className={`mt-1 font-serif text-text-primary ${compact ? "text-sm" : "text-[15px]"}`}>{field.value?.displayValue}</div>
          )}
          {gauge?.value && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[11px] text-text-muted">{gaugeQ ? `Q${gaugeQ}` : ""}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-subtle">
                <div className="h-full rounded-full bg-clinical-blue" style={{ width: `${Math.max(0, Math.min(100, Number(gauge.value.value) || 0))}%` }} />
              </div>
              <span className="text-sm font-semibold text-text-primary">{gauge.value.displayValue}%</span>
            </div>
          )}
          <div className="mt-2 flex gap-2">
            {draftPending && <Button size="sm" onClick={() => onConfirm(field.definition.worksheetFieldKey)} disabled={busy}>Confirm</Button>}
            <Button size="sm" variant="ghost" onClick={() => { setDraft(field.value?.displayValue ?? ""); setEditing(true); }} disabled={busy}>Edit</Button>
          </div>
        </>
      ) : (
        <div className="mt-1 text-sm text-text-muted">&hellip;</div>
      )}
    </motion.div>
  );
}
