"use client";

import { useReducedMotionPreference } from "@/lib/motion/use-reduced-motion-preference";
import { CycleArrow, WorksheetCell } from "@/components/runtime/worksheet-renderers/shared";
import type { WorksheetFieldView, WorksheetView } from "@/types/worksheet";

// Recreates the TBCT Session 1 "Conceptualization Diagram" (three-person
// teaching example): one shared Situation feeding three parallel
// Thought -> Emotion -> Behavior branches (candidates 1-3), then the
// participant's own cycle expressed as three link-recognition cells plus a
// confirmed summary. See tbct-s01.ts's header for why the personal cycle is
// grounded in the candidate example rather than a fourth discrete quad.

const CANDIDATES = [
  { n: "1", tone: "Candidate 1", thought: "candidateOneThought", emotion: "candidateOneEmotion", behavior: "candidateOneBehavior" },
  { n: "2", tone: "Candidate 2", thought: "candidateTwoThought", emotion: "candidateTwoEmotion", behavior: "candidateTwoBehavior" },
  { n: "3", tone: "Candidate 3", thought: "candidateThreeThought", emotion: "candidateThreeEmotion", behavior: "candidateThreeBehavior" },
] as const;

export function S01Worksheet({
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
      {/* One shared Situation feeding three parallel candidate branches */}
      <WorksheetCell field={get("situationThoughtDistinction")} q="1" active={isActive(get("situationThoughtDistinction"))} onConfirm={onConfirm} onEdit={onEdit} busy={busy} reducedMotion={reducedMotion} label="The shared situation" />

      <div className="space-y-3">
        {CANDIDATES.map((candidate) => (
          <div key={candidate.n} className="rounded-panel border border-border/70 bg-surface/60 p-2 sm:p-3">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-clinical-blue/30 bg-clinical-blue-light/30 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-clinical-blue">
              {candidate.tone}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-stretch">
              <WorksheetCell field={get(candidate.thought)} q="2" label="Thought" compact active={isActive(get(candidate.thought))} onConfirm={onConfirm} onEdit={onEdit} busy={busy} reducedMotion={reducedMotion} />
              <CycleArrow reducedMotion={reducedMotion} />
              <WorksheetCell field={get(candidate.emotion)} q="2" label="Emotion" compact active={isActive(get(candidate.emotion))} onConfirm={onConfirm} onEdit={onEdit} busy={busy} reducedMotion={reducedMotion} />
              <CycleArrow reducedMotion={reducedMotion} />
              <WorksheetCell field={get(candidate.behavior)} q="2" label="Behavior" compact active={isActive(get(candidate.behavior))} onConfirm={onConfirm} onEdit={onEdit} busy={busy} reducedMotion={reducedMotion} />
            </div>
          </div>
        ))}
      </div>

      <WorksheetCell field={get("threePersonModelInsight")} q="2" label="What the three-person example showed me" active={isActive(get("threePersonModelInsight"))} onConfirm={onConfirm} onEdit={onEdit} busy={busy} reducedMotion={reducedMotion} />

      {/* Personal cycle -- link recognition, framed as its own loop */}
      <div className="rounded-panel border border-dashed border-clinical-blue/40 p-3 sm:p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-text-muted">My own cycle</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <WorksheetCell field={get("personalThoughtEmotionLink")} q="3" label="Thought → Emotion" compact active={isActive(get("personalThoughtEmotionLink"))} onConfirm={onConfirm} onEdit={onEdit} busy={busy} reducedMotion={reducedMotion} />
          <CycleArrow reducedMotion={reducedMotion} />
          <WorksheetCell field={get("personalEmotionBehaviorLink")} q="3" label="Emotion → Behavior" compact active={isActive(get("personalEmotionBehaviorLink"))} onConfirm={onConfirm} onEdit={onEdit} busy={busy} reducedMotion={reducedMotion} />
          <CycleArrow reducedMotion={reducedMotion} />
          <WorksheetCell field={get("personalBehaviorSituationLink")} q="3" label="Behavior → Situation" compact active={isActive(get("personalBehaviorSituationLink"))} onConfirm={onConfirm} onEdit={onEdit} busy={busy} reducedMotion={reducedMotion} />
        </div>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-text-muted" aria-hidden>
          <span className="h-px flex-1 border-t border-dashed border-clinical-blue/30" />
          <span>and the loop feeds itself again</span>
          <span className="h-px flex-1 border-t border-dashed border-clinical-blue/30" />
        </div>
      </div>

      <div className="rounded-panel border-2 border-clinical-blue/40 bg-clinical-blue-light/20 p-1">
        <WorksheetCell field={get("participantSummary")} q="4" label="My summary" borderless active={isActive(get("participantSummary"))} onConfirm={onConfirm} onEdit={onEdit} busy={busy} reducedMotion={reducedMotion} />
      </div>

      <WorksheetCell field={get("participantSelectedDistortions")} q="5" label="Distortions I recognized" list active={isActive(get("participantSelectedDistortions"))} onConfirm={onConfirm} onEdit={onEdit} busy={busy} reducedMotion={reducedMotion} />
    </div>
  );
}
