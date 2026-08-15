"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Badge, Button, Card, EmptyState, Field, PageHeader, inputClass, textareaClass } from "@/components/ui/primitives";
import { useT } from "@/lib/i18n/context";
import {
  getSessionCommonRules,
  getSessionPrompts,
  restorePromptItemFromVerbatim,
  saveSessionCommonRules,
  sessionCatalog,
  updatePromptItem,
} from "@/lib/session-catalog";

/**
 * A companion chapter to the Protocol Editor (linked from its header, see
 * protocol-page.tsx) aimed specifically at clinicians who don't want to work
 * through the canvas/inspector -- for each question a session actually asks,
 * shows the original manual wording next to whatever it's been edited to,
 * plainly labeled, so "did I already change this, and from what" is obvious
 * at a glance instead of a single unlabeled badge buried in a details panel.
 *
 * Reads/writes the exact same local draft store as inspector-panel.tsx
 * (session-catalog.ts's getSessionPrompts/updatePromptItem/
 * restorePromptItemFromVerbatim) -- this is a second, friendlier window
 * onto the same data, not a separate copy of it. Edits made here still only
 * reach real patient sessions once published from Protocol Studio, exactly
 * like edits made in the canvas/inspector view.
 */
export function ProtocolManualReflectionPage() {
  const { t } = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedSessionId = searchParams.get("sessionId") ?? "tbct-session-03";
  // session-catalog.ts's store is a plain local (IndexedDB-backed) module,
  // not a react-query cache -- nothing re-renders this page automatically
  // after a mutation, so a tick counter forces a re-read after every edit.
  const [tick, setTick] = useState(0);
  void tick;
  const rerender = () => setTick((value) => value + 1);

  const sessionMeta = sessionCatalog.find((session) => session.id === selectedSessionId);
  const prompts = getSessionPrompts(selectedSessionId);
  const commonRules = getSessionCommonRules(selectedSessionId);

  const handleEditText = (id: string, value: string) => {
    updatePromptItem(id, { editableText: value });
    rerender();
  };
  const handleEditGuidance = (id: string, value: string) => {
    updatePromptItem(id, { modelGuidance: value });
    rerender();
  };
  const handleRestoreVerbatim = (id: string) => {
    restorePromptItemFromVerbatim(id);
    rerender();
  };
  const handleEditTone = (value: string) => {
    if (!commonRules) return;
    saveSessionCommonRules(selectedSessionId, { ...commonRules, roleAndStance: value });
    rerender();
  };

  return (
    <AppShell>
      <PageHeader
        title={t("manualReflection.pageTitle")}
        description={t("manualReflection.pageDescription")}
        meta={<Badge tone="neutral">{sessionMeta?.title ?? selectedSessionId}</Badge>}
        actions={
          <div className="flex flex-col gap-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">{t("protocolEditor.session")}</div>
            <select
              className={inputClass}
              value={sessionMeta?.id ?? selectedSessionId}
              onChange={(event) => router.push(`/projects/demo/protocols/tbct-br-001/manual-reflection?sessionId=${event.target.value}`)}
            >
              {sessionCatalog.map((session) => (
                <option key={session.id} value={session.id}>{session.number.toString().padStart(2, "0")} · {session.title}</option>
              ))}
            </select>
          </div>
        }
      />
      <div className="space-y-4 p-4 lg:p-6">
        <Card className="border-clinical-blue-light bg-clinical-blue-light/40 p-4">
          <div className="text-sm font-semibold text-text-primary">{t("manualReflection.introTitle")}</div>
          <p className="mt-1 text-sm text-text-secondary">{t("manualReflection.introBody")}</p>
        </Card>

        {commonRules && (
          <Card className="p-4">
            <Field label={t("manualReflection.toneLabel")} hint={t("manualReflection.toneHint")}>
              <textarea
                className={textareaClass}
                value={commonRules.roleAndStance}
                placeholder={t("manualReflection.tonePlaceholder")}
                onChange={(event) => handleEditTone(event.target.value)}
              />
            </Field>
          </Card>
        )}

        {!prompts.length && (
          <Card><EmptyState title={t("manualReflection.emptyTitle")} description={t("manualReflection.emptyBody")} /></Card>
        )}

        {prompts.map((promptItem) => {
          const changed = promptItem.editableText !== promptItem.verbatimText;
          const trace = promptItem.sourceTrace;
          return (
            <Card key={promptItem.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold text-text-primary">
                  {t("manualReflection.questionNumber", { number: promptItem.order })}
                </div>
                <Badge tone={changed ? "primary" : "neutral"}>
                  {changed ? t("manualReflection.changed") : t("manualReflection.unchanged")}
                </Badge>
              </div>
              {trace?.sourceSection && (
                <div className="text-xs text-text-muted">
                  {t("manualReflection.sourceLabel", { section: trace.sourceSection })}
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("manualReflection.originalLabel")} hint={t("manualReflection.originalHint")}>
                  <textarea className={textareaClass} value={promptItem.verbatimText} readOnly />
                </Field>
                <Field label={t("manualReflection.currentLabel")} hint={t("manualReflection.currentHint")}>
                  <textarea
                    className={textareaClass}
                    value={promptItem.editableText}
                    onChange={(event) => handleEditText(promptItem.id, event.target.value)}
                  />
                </Field>
              </div>
              <Field label={t("manualReflection.guidanceLabel")} hint={t("manualReflection.guidanceHint")}>
                <textarea
                  className={textareaClass}
                  value={promptItem.modelGuidance ?? ""}
                  onChange={(event) => handleEditGuidance(promptItem.id, event.target.value)}
                />
              </Field>
              {changed && (
                <Button variant="secondary" size="sm" onClick={() => handleRestoreVerbatim(promptItem.id)}>
                  {t("manualReflection.restoreVerbatim")}
                </Button>
              )}
            </Card>
          );
        })}

        <Card className="p-4 text-xs text-text-secondary">
          {t("manualReflection.publishReminder")}{" "}
          <Link href={`/projects/demo/protocols/tbct-br-001/canvas?sessionId=${selectedSessionId}`} className="text-clinical-blue hover:underline">
            {t("manualReflection.goToPublish")}
          </Link>
        </Card>
      </div>
    </AppShell>
  );
}
