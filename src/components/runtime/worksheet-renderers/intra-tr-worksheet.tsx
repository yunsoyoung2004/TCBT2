"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Badge, Button } from "@/components/ui/primitives";
import { fadeScale, fadeUp, highlightPulse } from "@/lib/motion/motion-variants";
import { useReducedMotionPreference } from "@/lib/motion/use-reduced-motion-preference";
import type { WorksheetFieldView, WorksheetView } from "@/types/worksheet";

// Recreates the original TBCT Intra-TR figure (Session 3 manual, Annex):
// a top box-cycle (Situation -> Automatic Thought -> Emotion -> Behavior &
// Body, looping back), the pros/cons/distortion/evidence strip beneath it,
// a conclusion, and a final-check row -- rather than a flat field-status
// list. Every cell is a live projection of a canonical runtime field (see
// worksheet-projection.ts); nothing here is decorative-only data.
//
// Not yet represented as boxes (see tbct-s03.ts's binding-registry header
// for why): the original figure's "New emotion(s)" row (11a/11b) needs a
// multi-emotion evaluation_matrix renderer this pass doesn't build yet --
// omitted rather than faked with an always-empty box.

export function IntraTRWorksheet({
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
      {/* Top cycle: Situation -> Automatic Thought -> Emotion -> Behavior & Body, looping back */}
      <div className="relative">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-stretch">
          <WorksheetCell field={get("situation")} q="1" active={isActive(get("situation"))} onConfirm={onConfirm} onEdit={onEdit} busy={busy} reducedMotion={reducedMotion} />
          <CycleArrow reducedMotion={reducedMotion} />
          <WorksheetCell field={get("automaticThought")} q="2a" gauge={get("automaticThoughtBeliefPercent")} gaugeQ="2b" active={isActive(get("automaticThought")) || isActive(get("automaticThoughtBeliefPercent"))} onConfirm={onConfirm} onEdit={onEdit} busy={busy} reducedMotion={reducedMotion} />
          <CycleArrow reducedMotion={reducedMotion} />
          <WorksheetCell field={get("primaryEmotion")} q="3a" gauge={get("primaryEmotionIntensityPercent")} gaugeQ="3b" active={isActive(get("primaryEmotion")) || isActive(get("primaryEmotionIntensityPercent"))} onConfirm={onConfirm} onEdit={onEdit} busy={busy} reducedMotion={reducedMotion} />
          <CycleArrow reducedMotion={reducedMotion} />
          <div className="grid gap-2">
            <WorksheetCell field={get("behavior")} q="4a" active={isActive(get("behavior"))} onConfirm={onConfirm} onEdit={onEdit} busy={busy} reducedMotion={reducedMotion} compact />
            <WorksheetCell field={get("bodySensations")} q="4b" active={isActive(get("bodySensations"))} onConfirm={onConfirm} onEdit={onEdit} busy={busy} reducedMotion={reducedMotion} compact />
          </div>
        </div>
        <LoopBackArrow />
      </div>

      {/* Pros / cons, distortion, evidence -- the "turning the thought over" strip */}
      <div className="grid gap-3 sm:grid-cols-2">
        <WorksheetCell field={get("behaviorPros")} q="5" active={isActive(get("behaviorPros"))} onConfirm={onConfirm} onEdit={onEdit} busy={busy} reducedMotion={reducedMotion} tone="neutral" />
        <WorksheetCell field={get("behaviorCons")} q="6" active={isActive(get("behaviorCons"))} onConfirm={onConfirm} onEdit={onEdit} busy={busy} reducedMotion={reducedMotion} tone="neutral" />
      </div>
      <WorksheetCell field={get("cognitiveDistortion")} q="7" active={isActive(get("cognitiveDistortion"))} onConfirm={onConfirm} onEdit={onEdit} busy={busy} reducedMotion={reducedMotion} chip />
      <div className="grid gap-3 sm:grid-cols-2">
        <WorksheetCell field={get("evidenceFor")} q="8" active={isActive(get("evidenceFor"))} onConfirm={onConfirm} onEdit={onEdit} busy={busy} reducedMotion={reducedMotion} list />
        <WorksheetCell field={get("evidenceAgainst")} q="9" active={isActive(get("evidenceAgainst"))} onConfirm={onConfirm} onEdit={onEdit} busy={busy} reducedMotion={reducedMotion} list emphasized />
      </div>

      {/* Conclusion, leading into what's felt/done/noticed now */}
      <div className="rounded-panel border-2 border-clinical-blue/40 bg-clinical-blue-light/20 p-1">
        <WorksheetCell field={get("balancedConclusion")} q="10a" gauge={get("conclusionBeliefPercent")} gaugeQ="10b" active={isActive(get("balancedConclusion")) || isActive(get("conclusionBeliefPercent"))} onConfirm={onConfirm} onEdit={onEdit} busy={busy} reducedMotion={reducedMotion} borderless label="Conclusion" />
      </div>
      <div className="flex items-center justify-center text-text-muted" aria-hidden>
        <ArrowDown reducedMotion={reducedMotion} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <WorksheetCell field={get("intendedActions")} q="12a" active={isActive(get("intendedActions"))} onConfirm={onConfirm} onEdit={onEdit} busy={busy} reducedMotion={reducedMotion} list />
        <WorksheetCell field={get("newBodySensations")} q="12b" active={isActive(get("newBodySensations"))} onConfirm={onConfirm} onEdit={onEdit} busy={busy} reducedMotion={reducedMotion} />
      </div>

      {/* Final check */}
      <div className="grid gap-3 rounded-panel border border-border bg-surface p-4 sm:grid-cols-2">
        <WorksheetCell field={get("revisedAutomaticThoughtBeliefPercent")} q="13" active={isActive(get("revisedAutomaticThoughtBeliefPercent"))} onConfirm={onConfirm} onEdit={onEdit} busy={busy} reducedMotion={reducedMotion} borderless label="Belief in the original thought now" />
        <HowAmINow field={get("globalEvaluation")} active={isActive(get("globalEvaluation"))} />
      </div>
    </div>
  );
}

function CycleArrow({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div className="hidden items-center justify-center sm:flex" aria-hidden>
      <motion.svg width="28" height="16" viewBox="0 0 28 16" variants={reducedMotion ? undefined : fadeScale} initial={reducedMotion ? false : "initial"} animate={reducedMotion ? undefined : "animate"}>
        <line x1="1" y1="8" x2="22" y2="8" stroke="currentColor" strokeWidth="1.5" className="text-text-muted" />
        <path d="M22 8 L16 4 M22 8 L16 12" stroke="currentColor" strokeWidth="1.5" fill="none" className="text-text-muted" />
      </motion.svg>
    </div>
  );
}

function ArrowDown({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <motion.svg width="16" height="24" viewBox="0 0 16 24" variants={reducedMotion ? undefined : fadeScale} initial={reducedMotion ? false : "initial"} animate={reducedMotion ? undefined : "animate"}>
      <line x1="8" y1="1" x2="8" y2="18" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 18 L4 12 M8 18 L12 12" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </motion.svg>
  );
}

function LoopBackArrow() {
  // Decorative echo of the original figure's dashed "loops back" arrow
  // running from Behavior & Body back to Situation. Static/CSS-only --
  // doesn't need per-box coordinates since it's illustrative, not data-bound.
  return (
    <div className="mt-1 hidden items-center gap-2 text-[11px] text-text-muted sm:flex" aria-hidden>
      <span className="h-px flex-1 border-t border-dashed border-clinical-blue/30" />
      <span>the pattern loops back and feeds itself again</span>
      <span className="h-px flex-1 border-t border-dashed border-clinical-blue/30" />
    </div>
  );
}

function HowAmINow({ field, active }: { field?: WorksheetFieldView; active: boolean }) {
  const options = [
    { value: "same", label: "The same" },
    { value: "a little better", label: "A little better" },
    { value: "much better", label: "Much better" },
  ];
  const current = field?.value?.value;
  return (
    <div className={`rounded-panel p-2 transition ${active ? "ring-2 ring-clinical-blue" : ""}`}>
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-text-muted">Q14 &middot; How am I now?</div>
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

function WorksheetCell({
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
  if (!field) return null;
  const filled = field.value !== null && field.value.value !== undefined && field.value.value !== "";
  const confirmed = field.value?.status === "participant_confirmed";
  const draftPending = field.value?.status === "draft_extracted";

  const shell = `rounded-panel p-3 transition ${borderless ? "" : `border ${emphasized ? "border-warning/50 bg-warning-light/15" : tone === "neutral" ? "border-border bg-surface" : "border-border bg-surface"}`} ${active ? "ring-2 ring-clinical-blue border-clinical-blue" : ""} ${!filled ? "border-dashed opacity-70" : ""}`;

  const cellVariants = active ? highlightPulse : fadeUp;
  return (
    <motion.div
      className={shell}
      variants={reducedMotion ? undefined : cellVariants}
      initial={reducedMotion ? false : "initial"}
      animate={reducedMotion ? undefined : "animate"}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-muted">{label ?? `Q${q}`}</div>
        {confirmed && <Badge tone="success">confirmed</Badge>}
      </div>
      {editing ? (
        <div className="mt-2 space-y-2">
          <textarea className="w-full rounded-panel border border-border bg-surface px-2 py-1.5 text-sm" rows={2} value={draft} onChange={(event) => setDraft(event.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={() => { onEdit(field.definition.worksheetFieldKey, draft); setEditing(false); }}>Save</Button>
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
