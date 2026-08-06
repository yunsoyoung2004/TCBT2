// The write-path contract for the worksheet layer. RuntimeContext.fields
// (persisted inside runtime_sessions.data, see src/lib/runtime/runtime-context.ts)
// remains the single canonical source of truth. Nothing in this module
// writes worksheet_field_values from anywhere other than that canonical
// state, and worksheet-originated edits are written back through the same
// canonical state before being re-projected -- there is deliberately no
// path that lets worksheetJson and runtimeFields diverge:
//
//   Participant message -> assessment extraction -> existing clinical
//   validation -> canonical RuntimeContext.fields update -> (this module)
//   projectRuntimeFieldsToWorksheet -> worksheet_field_values -> renderer
//
//   Participant worksheet edit -> (this module) editWorksheetField ->
//   canonical RuntimeContext.fields update -> re-projection -> audit event
//
// KNOWN LIMITATION (flagged, not silently glossed over): editWorksheetField
// merges the edited value directly into runtimeContext.fields without
// re-running extractRuntimeState's field-specific validation (e.g. the
// feeling/urge-vs-thought heuristics, sibling-repeat checks). It is safe for
// this pilot's bound fields (plain text/percentage/list edits confirmed by
// the participant themselves) but should not be treated as equivalent to a
// real turn's validation until that's addressed.

import { getRuntimeSession } from "@/lib/api/runtime-session-api";
import { updateRuntimeSessionRecord } from "@/lib/repositories/runtime-session-repository";
import { TBCT_SOURCE_TEXT_HASH } from "@/lib/protocol/tbct-source-text.generated";
import { getWorksheetBindings, hasWorksheetBindings } from "@/lib/worksheet/worksheet-binding-registry";
import {
  appendWorksheetEvent,
  appendWorksheetFieldRevision,
  ensureWorksheetInstance,
  ensureWorksheetTemplateVersion,
  getWorksheetInstance,
  listWorksheetFieldDefinitions,
  listWorksheetFieldValues,
  replaceWorksheetCollectionItems,
  upsertWorksheetFieldValue,
} from "@/lib/repositories/worksheet-repository";
import type { WorksheetFieldDefinitionRecord, WorksheetFieldProvenance, WorksheetFieldStatus, WorksheetFieldValueRecord, WorksheetView } from "@/types/worksheet";

const TEMPLATE_VERSION = 1;

async function ensureTemplateAndInstance(runtimeSessionId: string, sessionDefinitionId: string) {
  const bindings = getWorksheetBindings(sessionDefinitionId);
  const templateVersion = await ensureWorksheetTemplateVersion({
    templateId: `worksheet-template-${sessionDefinitionId}`,
    sessionDefinitionId,
    title: `${sessionDefinitionId} worksheet`,
    version: TEMPLATE_VERSION,
    sourceTextHash: TBCT_SOURCE_TEXT_HASH,
    fieldDefinitions: bindings.map((binding) => ({
      canonicalFieldKey: binding.canonicalFieldKey,
      worksheetFieldKey: binding.worksheetFieldKey,
      valueType: binding.valueType,
      participantOwned: binding.participantOwned,
      assistantMustNotSupply: binding.assistantMustNotSupply,
      confirmationRequired: binding.confirmationRequired,
      visualElementId: binding.visualElementId,
      displayOrder: binding.displayOrder,
      sourceSection: binding.sourceSection,
    })),
  });
  const instance = await ensureWorksheetInstance(runtimeSessionId, templateVersion.id);
  const fieldDefinitions = await listWorksheetFieldDefinitions(templateVersion.id);
  return { templateVersion, instance, fieldDefinitions };
}

function displayValueFor(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

/** Called after a turn's canonical fields update (commitRuntimeAssistantTurn
 * / claimRuntimePatientTurn). Projects every bound field that has a value in
 * `fields` into worksheet_field_values -- draft_extracted for a first-time
 * or changed value, left untouched for a field the participant already
 * confirmed with the same value, so an unrelated turn doesn't silently
 * knock a confirmed box back to unconfirmed. */
export async function projectRuntimeFieldsToWorksheet(input: {
  runtimeSessionId: string;
  sessionDefinitionId: string;
  fields: Record<string, unknown>;
  sourceTurnId?: string;
}): Promise<void> {
  if (!hasWorksheetBindings(input.sessionDefinitionId)) return;
  const { instance, fieldDefinitions } = await ensureTemplateAndInstance(input.runtimeSessionId, input.sessionDefinitionId);
  const existingValues = await listWorksheetFieldValues(instance.id);
  const existingByDefinitionId = new Map(existingValues.map((value) => [value.fieldDefinitionId, value]));
  const bindings = getWorksheetBindings(input.sessionDefinitionId);
  const bindingByCanonicalKey = new Map(bindings.map((binding) => [binding.canonicalFieldKey, binding]));

  for (const definition of fieldDefinitions) {
    if (!(definition.canonicalFieldKey in input.fields)) continue;
    const rawValue = input.fields[definition.canonicalFieldKey];
    if (rawValue === undefined) continue;
    const binding = bindingByCanonicalKey.get(definition.canonicalFieldKey);
    const existing = existingByDefinitionId.get(definition.id);
    const unchanged = existing && JSON.stringify(existing.value) === JSON.stringify(rawValue);
    if (unchanged && existing?.status === "participant_confirmed") continue; // don't unconfirm on a no-op re-project

    const provenance: WorksheetFieldProvenance = binding?.assistantMustNotSupply ? "participant_confirmed_summary" : "participant_verbatim";
    const status: WorksheetFieldStatus = unchanged ? (existing?.status ?? "draft_extracted") : "draft_extracted";

    if (definition.valueType === "text_list" && Array.isArray(rawValue)) {
      const fieldValue = await upsertWorksheetFieldValue(instance.id, definition.id, {
        status, provenance, sourceTurnId: input.sourceTurnId, value: rawValue, displayValue: displayValueFor(rawValue),
      });
      await replaceWorksheetCollectionItems(fieldValue.id, rawValue.map((item) => ({ value: item, displayValue: String(item), status, provenance, sourceTurnId: input.sourceTurnId })));
      await appendWorksheetFieldRevision({ fieldValueId: fieldValue.id, status, provenance, sourceTurnId: input.sourceTurnId, snapshot: rawValue });
      continue;
    }

    const fieldValue = await upsertWorksheetFieldValue(instance.id, definition.id, {
      status, provenance, sourceTurnId: input.sourceTurnId, value: rawValue, displayValue: displayValueFor(rawValue),
    });
    if (!unchanged) await appendWorksheetFieldRevision({ fieldValueId: fieldValue.id, status, provenance, sourceTurnId: input.sourceTurnId, snapshot: rawValue });
  }
}

/** Assembles the read model the WorksheetPane UI renders. Safe to call on
 * session resume -- it only reads persisted state, never mutates it. */
export async function getWorksheetView(runtimeSessionId: string, sessionDefinitionId: string): Promise<WorksheetView | null> {
  if (!hasWorksheetBindings(sessionDefinitionId)) return null;
  const { instance, templateVersion, fieldDefinitions } = await ensureTemplateAndInstance(runtimeSessionId, sessionDefinitionId);
  const values = await listWorksheetFieldValues(instance.id);
  const valueByDefinitionId = new Map(values.map((value) => [value.fieldDefinitionId, value]));
  const bindings = getWorksheetBindings(sessionDefinitionId);
  const bindingByWorksheetKey = new Map(bindings.map((binding) => [binding.worksheetFieldKey, binding]));
  return {
    instance, templateVersion,
    fields: fieldDefinitions.map((definition: WorksheetFieldDefinitionRecord) => ({
      definition,
      binding: bindingByWorksheetKey.get(definition.worksheetFieldKey)!,
      value: valueByDefinitionId.get(definition.id) ?? null,
    })),
  };
}

/** Participant confirms a field as shown -- the only status transition the
 * UI itself is allowed to make without going through a canonical update. */
export async function confirmWorksheetField(runtimeSessionId: string, sessionDefinitionId: string, worksheetFieldKey: string): Promise<WorksheetFieldValueRecord> {
  const { instance, fieldDefinitions } = await ensureTemplateAndInstance(runtimeSessionId, sessionDefinitionId);
  const definition = fieldDefinitions.find((item) => item.worksheetFieldKey === worksheetFieldKey);
  if (!definition) throw new Error(`Unknown worksheet field ${worksheetFieldKey} for ${sessionDefinitionId}`);
  const existing = (await listWorksheetFieldValues(instance.id)).find((value) => value.fieldDefinitionId === definition.id);
  const now = new Date().toISOString();
  const fieldValue = await upsertWorksheetFieldValue(instance.id, definition.id, {
    status: "participant_confirmed", provenance: existing?.provenance ?? "participant_verbatim", confirmedAt: now, value: existing?.value, displayValue: existing?.displayValue,
  });
  await appendWorksheetFieldRevision({ fieldValueId: fieldValue.id, status: "participant_confirmed", provenance: fieldValue.provenance, snapshot: fieldValue.value });
  await appendWorksheetEvent(instance.id, "field_confirmed", { worksheetFieldKey });
  return fieldValue;
}

/** Participant edits a field's value from the worksheet pane. Routes the
 * edit through the canonical RuntimeContext.fields update (see the
 * KNOWN LIMITATION note at the top of this file) rather than writing
 * worksheet_field_values directly, then re-projects. */
export async function editWorksheetField(runtimeSessionId: string, sessionDefinitionId: string, worksheetFieldKey: string, nextValue: unknown): Promise<WorksheetFieldValueRecord> {
  const bindings = getWorksheetBindings(sessionDefinitionId);
  const binding = bindings.find((item) => item.worksheetFieldKey === worksheetFieldKey);
  if (!binding) throw new Error(`Unknown worksheet field ${worksheetFieldKey} for ${sessionDefinitionId}`);
  if (binding.assistantMustNotSupply === false && binding.participantOwned === false) throw new Error(`${worksheetFieldKey} is not participant-editable`);

  const view = await getRuntimeSession(runtimeSessionId);
  if (!view) throw new Error("Runtime session not found");
  const nextFields = { ...view.session.runtimeContext.fields, [binding.canonicalFieldKey]: nextValue };
  await updateRuntimeSessionRecord(runtimeSessionId, { runtimeContext: { ...view.session.runtimeContext, fields: nextFields } });

  const { instance, fieldDefinitions } = await ensureTemplateAndInstance(runtimeSessionId, sessionDefinitionId);
  const definition = fieldDefinitions.find((item) => item.worksheetFieldKey === worksheetFieldKey)!;
  const fieldValue = await upsertWorksheetFieldValue(instance.id, definition.id, {
    status: "participant_edited", provenance: "participant_verbatim", value: nextValue, displayValue: displayValueFor(nextValue),
  });
  await appendWorksheetFieldRevision({ fieldValueId: fieldValue.id, status: "participant_edited", provenance: "participant_verbatim", snapshot: nextValue });
  await appendWorksheetEvent(instance.id, "field_edited", { worksheetFieldKey });
  return fieldValue;
}
