"use client";

import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { Badge, Button, Card, EmptyState, Field, SectionHeader, ValidationSeverityBadge, inputClass, textareaClass } from "@/components/ui/primitives";
import { statusTransition } from "@/lib/motion/motion-variants";
import { useT } from "@/lib/i18n/context";
import { summarizeCondition } from "./types";
import type { ProtocolGraphNode, ProtocolValidationRun } from "@/types/protocol-runtime";
import type { PromptItem, SessionCommonRules } from "@/lib/session-catalog";
import type { SourceEvidence } from "@/types/clinical-assets";

export interface NextStepOption {
  edgeId: string;
  targetNodeId: string;
  targetTitle: string;
}

export interface InspectorPanelProps {
  draft: ProtocolGraphNode | null;
  onDraftChange: (next: ProtocolGraphNode) => void;
  immutableSourceView: boolean;
  sessionPrompts: PromptItem[];
  selectedPromptItem: PromptItem | null;
  onSelectPromptItem: (id: string) => void;
  onRestoreVerbatim: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onMovePromptItem: (id: string, direction: -1 | 1) => void;
  onUpdatePromptItem: (id: string, patch: Partial<PromptItem>) => void;
  sessionCommonRules: SessionCommonRules | null;
  onSaveSessionCommonRules: (next: SessionCommonRules) => void;
  nextStepOptions: NextStepOption[];
  compiledPreviewText: string | null;
  validationRun?: ProtocolValidationRun;
  fieldErrors: Partial<Record<"question" | "nextStep" | "closingPath" | "generic", string>>;
  onSave: () => void;
  onPreview: () => void;
  saving: boolean;
  previewing: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
  availableEvidence: SourceEvidence[];
  selectedEvidenceId: string;
  onSelectedEvidenceIdChange: (id: string) => void;
  onAttachEvidence: () => void;
  attachingEvidence: boolean;
  safetyRules: Array<{ id: string; title: string }>;
  onAttachSafetyRule: (ruleId: string) => void;
  focusSourceEvidence?: boolean;
}

export function InspectorPanel(props: InspectorPanelProps) {
  const { t } = useT();
  const {
    draft, onDraftChange, immutableSourceView, sessionPrompts, selectedPromptItem, onSelectPromptItem,
    onUpdatePromptItem,
    sessionCommonRules, onSaveSessionCommonRules,
    validationRun, fieldErrors, onSave, saving, onDelete,
  } = props;

  if (!draft) {
    return (
      <Card className="min-w-[320px] max-w-[480px] shrink-0 overflow-hidden xl:w-[380px]">
        <SectionHeader title={t("protocolEditor.nodeInspector")} />
        <EmptyState title={t("protocolEditor.noStepSelected")} description={t("protocolEditor.selectStepPrompt")} />
      </Card>
    );
  }

  const nodeValidationIssues = validationRun?.issues.filter((issue) => issue.nodeId === draft.id) ?? [];

  return (
    <Card className="min-w-[320px] max-w-[480px] shrink-0 overflow-hidden xl:w-[380px]">
      <SectionHeader title={t("protocolEditor.nodeInspector")} description={draft.data.title} />
      <motion.div key={draft.id} className="max-h-[calc(100vh-330px)] space-y-4 overflow-auto p-4" variants={statusTransition} initial="initial" animate="animate">
        <Field label={t("protocolEditor.stepName")}>
          <input value={draft.data.title} readOnly={immutableSourceView} onChange={(event) => onDraftChange({ ...draft, data: { ...draft.data, title: event.target.value } })} className={inputClass} />
        </Field>

        <Field label={t("protocolEditor.clinicalPurpose")}>
          <textarea value={draft.data.clinicalIntent ?? ""} readOnly={immutableSourceView} onChange={(event) => onDraftChange({ ...draft, data: { ...draft.data, clinicalIntent: event.target.value } })} className={textareaClass} />
        </Field>

        <details className="rounded-panel border border-border bg-surface-subtle p-3" open={Boolean(selectedPromptItem)}>
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">{t("protocolEditor.questionsAndInstructions")}</summary>
          <div className="mt-3 space-y-2">
            {sessionPrompts.map((promptItem) => {
              const isSelected = selectedPromptItem?.id === promptItem.id;
              return (
                <div key={promptItem.id} className={`rounded-panel border p-3 ${isSelected ? "border-clinical-blue bg-surface" : "border-border bg-surface"}`}>
                  <button type="button" className="flex w-full items-center justify-between gap-2 text-left" onClick={() => onSelectPromptItem(promptItem.id)}>
                    <span className="text-sm font-semibold text-text-primary">{promptItem.order}. {promptItem.editableText.slice(0, 60) || t("protocolEditor.errors.missingQuestion")}</span>
                    <Badge tone={promptItem.status === "active" ? "success" : "neutral"}>{promptItem.status}</Badge>
                  </button>
                  <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                    <Badge tone={promptItem.editableText === promptItem.verbatimText ? "neutral" : "primary"}>
                      {promptItem.editableText === promptItem.verbatimText ? t("protocolEditor.unedited") : t("protocolEditor.editedFromSource")}
                    </Badge>
                  </div>
                  {isSelected && (
                    <div className="mt-3 space-y-3">
                      <Field label={t("protocolEditor.participantFacingText")}>
                        <textarea
                          className={textareaClass}
                          value={promptItem.editableText}
                          readOnly={immutableSourceView}
                          onChange={(event) => onUpdatePromptItem(promptItem.id, { editableText: event.target.value })}
                        />
                      </Field>
                      {fieldErrors.question && (
                        <div className="text-xs text-critical">{fieldErrors.question}</div>
                      )}
                      <Field label={t("protocolEditor.clinicianGuidance")}>
                        <textarea
                          className={textareaClass}
                          value={promptItem.modelGuidance ?? promptItem.aiInstruction}
                          readOnly={immutableSourceView}
                          onChange={(event) => onUpdatePromptItem(promptItem.id, { modelGuidance: event.target.value })}
                        />
                      </Field>
                      {promptItem.activationCondition && (
                        <Field label={t("protocolEditor.showWhen")}>
                          <ConditionSummary condition={promptItem.activationCondition} />
                        </Field>
                      )}
                      {promptItem.validation && (
                        <Field label={t("protocolEditor.expectedResponse")}>
                          <ExpectedResponseSummary validation={promptItem.validation} />
                        </Field>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {!sessionPrompts.length && <EmptyState title={t("protocolEditor.noStepSelected")} description={t("protocolEditor.selectStepPrompt")} />}
          </div>
        </details>

        {draft.data.safetyRuleIds.length > 0 && (
          <Badge tone="critical">{t("protocolEditor.requiredSafetyStep")}</Badge>
        )}

        {fieldErrors.closingPath && (
          <div className="rounded-panel border border-critical/40 bg-critical/10 p-3 text-sm text-critical">{fieldErrors.closingPath}</div>
        )}
        {fieldErrors.generic && (
          <div className="rounded-panel border border-critical/40 bg-critical/10 p-3 text-sm text-critical">{fieldErrors.generic}</div>
        )}

        {nodeValidationIssues.length > 0 && (
          <div className="rounded-panel border border-border p-3">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">Validation</div>
            <div className="mt-3 space-y-2">
              {nodeValidationIssues.map((issue) => (
                <div key={issue.id} className="rounded-panel border border-border bg-surface-subtle p-3">
                  <ValidationSeverityBadge severity={issue.severity === "information" ? "info" : issue.severity} />
                  <div className="mt-2 text-sm text-text-primary">{issue.message}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button className="w-full" disabled={immutableSourceView} loading={saving} onClick={onSave}>{t("protocolEditor.saveChanges")}</Button>
        <Button variant="danger" className="w-full" disabled={immutableSourceView} onClick={onDelete}><Trash2 className="h-4 w-4" />{t("protocolEditor.deleteStep")}</Button>

        <details className="rounded-panel border border-border bg-surface-subtle p-3">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">{t("protocolEditor.sessionCommonRules")}</summary>
          <fieldset disabled={immutableSourceView} className="mt-3 grid gap-3">
            <Field label={t("protocolEditor.sessionExplorer")}>
              <input className={inputClass} value={sessionCommonRules?.sessionTitle ?? ""} onChange={(event) => sessionCommonRules && onSaveSessionCommonRules({ ...sessionCommonRules, sessionTitle: event.target.value })} />
            </Field>
            <Field label={t("protocolEditor.clinicalPurpose")}>
              <textarea className={textareaClass} value={sessionCommonRules?.sessionObjective ?? ""} onChange={(event) => sessionCommonRules && onSaveSessionCommonRules({ ...sessionCommonRules, sessionObjective: event.target.value })} />
            </Field>
          </fieldset>
        </details>
      </motion.div>
    </Card>
  );
}

function ConditionSummary({ condition }: { condition: object | null }) {
  const { t } = useT();
  const summary = summarizeCondition(condition as { kind?: string; field?: string; operator?: string; value?: unknown } | null);
  if (!summary) return <div className="text-sm text-text-secondary">{t("common.unknown")}</div>;
  return <div className="rounded-panel border border-border bg-surface-subtle px-3 py-2 text-sm text-text-primary">{summary}</div>;
}

/** Plain-language summary of a validation/expected-response spec — never dumps raw keys like "kind". */
function summarizeExpectedResponse(validation: Record<string, unknown> | null, t: ReturnType<typeof useT>["t"]): string | null {
  if (!validation) return null;
  const kind = validation.kind as string | undefined;
  if (kind === "safety_check") return t("protocolEditor.expectedResponseKind.safetyCheck");
  if (kind === "rating") {
    const min = validation.min as number | undefined;
    const max = validation.max as number | undefined;
    return t("protocolEditor.expectedResponseKind.rating", { min: min ?? 0, max: max ?? 100 });
  }
  if (kind === "free_text" || kind === "text") return t("protocolEditor.expectedResponseKind.freeText");
  return null;
}

function ExpectedResponseSummary({ validation }: { validation: object | null }) {
  const { t } = useT();
  const record = (validation ?? null) as Record<string, unknown> | null;
  const summary = summarizeExpectedResponse(record, t);
  if (summary) return <div className="rounded-panel border border-border bg-surface-subtle px-3 py-2 text-sm text-text-primary">{summary}</div>;
  const entries = record ? Object.entries(record).filter(([key]) => key !== "kind") : [];
  if (!entries.length) return <div className="text-sm text-text-secondary">{t("common.unknown")}</div>;
  return (
    <div className="grid gap-1 rounded-panel border border-border bg-surface-subtle p-3 text-sm text-text-primary">
      {entries.map(([key, value]) => (
        <div key={key} className="flex justify-between gap-3">
          <span className="text-text-secondary">{key}</span>
          <span className="font-medium">{Array.isArray(value) ? value.join(", ") : String(value)}</span>
        </div>
      ))}
    </div>
  );
}
