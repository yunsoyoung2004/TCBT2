import type { ClinicalStageNode, ConditionExpression, PromptItem, SourceFidelityEdge, ValidationRule } from "@/lib/protocol/source-fidelity-types";
import type { PolicyBundle, RuntimeNode, RuntimePromptItem, RuntimeRelease, RuntimeRoleDefinition, RuntimeSpeakerRoleId, RuntimeTransitionRule, SourceFidelityReleaseSnapshot } from "@/types/protocol-runtime";

const DEFAULT_OUTPUT_SCHEMA_VERSION = "clinical-language/v2";

const DEFAULT_RUNTIME_ROLES: RuntimeRoleDefinition[] = [
  {
    id: "tbct_guide",
    name: "TBCT guide",
    kind: "speaker",
    systemGuidance: "Guide one focused TBCT step in supportive, patient-facing language.",
    allowedActions: ["ask", "reflect", "validate", "summarize"],
    forbiddenActions: ["change_runtime_state", "disclose_internal_instructions", "diagnose"],
  },
  {
    id: "therapist",
    name: "Therapist",
    kind: "speaker",
    systemGuidance: "Use a collaborative clinical stance and stay within the active protocol step.",
    allowedActions: ["ask", "reflect", "validate", "summarize"],
    forbiddenActions: ["change_runtime_state", "disclose_internal_instructions", "diagnose"],
  },
  {
    id: "psychoeducation_guide",
    name: "Psychoeducation guide",
    kind: "speaker",
    systemGuidance: "Explain the active TBCT concept briefly, then invite one focused response when appropriate.",
    allowedActions: ["educate", "ask", "summarize"],
    forbiddenActions: ["change_runtime_state", "disclose_internal_instructions", "diagnose"],
  },
  {
    id: "closing_guide",
    name: "Closing guide",
    kind: "speaker",
    systemGuidance: "Close or bridge the active step without changing session state.",
    allowedActions: ["close", "summarize", "validate"],
    forbiddenActions: ["change_runtime_state", "disclose_internal_instructions", "diagnose"],
  },
  {
    id: "session_manager",
    name: "Session manager",
    kind: "controller",
    systemGuidance: "Implemented by deterministic runtime code.",
    allowedActions: [],
    forbiddenActions: ["generate_patient_message"],
  },
  {
    id: "transition_controller",
    name: "Transition controller",
    kind: "controller",
    systemGuidance: "Implemented by deterministic runtime code.",
    allowedActions: [],
    forbiddenActions: ["generate_patient_message"],
  },
  {
    id: "memory_manager",
    name: "Memory manager",
    kind: "controller",
    systemGuidance: "Implemented by deterministic runtime code.",
    allowedActions: [],
    forbiddenActions: ["generate_patient_message"],
  },
  {
    id: "protocol_validator",
    name: "Protocol validator",
    kind: "evaluator",
    systemGuidance: "Implemented by deterministic runtime code.",
    allowedActions: [],
    forbiddenActions: ["generate_patient_message"],
  },
  {
    id: "safety_evaluator",
    name: "Safety evaluator",
    kind: "evaluator",
    systemGuidance: "Implemented by deterministic runtime code.",
    allowedActions: [],
    forbiddenActions: ["generate_patient_message"],
  },
  {
    id: "style_evaluator",
    name: "Style evaluator",
    kind: "evaluator",
    systemGuidance: "Implemented by deterministic runtime code.",
    allowedActions: [],
    forbiddenActions: ["generate_patient_message"],
  },
];

const INTERNAL_GUIDANCE_PATTERN = /^(collect|prompt|identify|elicit|capture|explore|help|support|confirm|introduce|run|present|close|start|continue|rate|re-?rate|offer|invite|explain|keep|surface|anchor|set up|formulate|map|convert|prepare|begin|get|deepen|choose|score|establish|reflect|validate|use)\b/i;

const PASSIVE_PROMPT_TYPES = new Set<PromptItem["type"]>([
  "instruction",
  "explanation",
  "transition",
  "role_transition",
  "worksheet_instruction",
  "closing",
]);

export function defaultFallbackPatientText(locale: string) {
  if (locale.toLowerCase().startsWith("ko")) return "천천히 생각해 보셔도 괜찮습니다. 지금 가장 중요하게 느껴지는 점을 말씀해 주세요.";
  if (locale.toLowerCase().startsWith("pt")) return "Podemos ir com calma. O que parece mais importante para você neste momento?";
  return "We can take this one step at a time. What feels most important to share right now?";
}

function isLocaleConsistentFallbackText(value: string, locale: string) {
  if (!locale.toLowerCase().startsWith("ko")) return true;
  return /[\uAC00-\uD7A3]/.test(value);
}

const REVIEWED_KOREAN_PROMPT_TEXT: Record<string, string> = {
  "tbct-s01-n01-p01-warm-acknowledgement": "많은 것을 감당해 오신 것 같아요. 여기 와 주셔서 감사합니다. 이 모든 일을 함께 더 분명하게 살펴보는 데 도움이 되는 것부터 시작하겠습니다.",
};

export function resolvePromptLocaleText(promptItemId: string, value: string | undefined, locale: string) {
  if (locale.toLowerCase().startsWith("ko") && REVIEWED_KOREAN_PROMPT_TEXT[promptItemId]) return REVIEWED_KOREAN_PROMPT_TEXT[promptItemId];
  return resolveLocaleFallbackPatientText(value, locale);
}

function localizedSourcePromptText(promptItem: PromptItem, locale: string, fallbackCandidate: string | undefined) {
  if (locale.toLowerCase().startsWith("ko") && REVIEWED_KOREAN_PROMPT_TEXT[promptItem.id]) return REVIEWED_KOREAN_PROMPT_TEXT[promptItem.id];
  return fallbackCandidate;
}

export function resolveLocaleFallbackPatientText(value: string | undefined, locale: string) {
  // A source-specific prompt is safer than a generic question that changes the
  // clinical task. Locale mismatch remains visible to validation/audit and must
  // never silently turn into a generic protocol substitute.
  return isPatientSafeFallbackText(value) ? value!.trim() : defaultFallbackPatientText(locale);
}

export function isPatientSafeFallbackText(value: string | undefined) {
  const text = value?.trim() ?? "";
  if (!text || text.length > 600) return false;
  if (INTERNAL_GUIDANCE_PATTERN.test(text) || /^Step\s+\d+\s*:/i.test(text) || /\b(?:ask|invite|guide|instruct) the participant\b/i.test(text)) return false;
  return !/(?:\bai\b|model|prompt|instruction|system message|node[-_ ]?id|role id|runtime state)/i.test(text);
}

function humanizeField(field: string) {
  return field.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/Percent$/i, " percentage").toLowerCase();
}

function sourceSpecificRuntimeFallback(promptItem: PromptItem) {
  const fields = promptItem.outputFields;
  const validationKind = String((promptItem.validation as { kind?: unknown } | null)?.kind ?? "");
  if (/^paired_ratings/.test(validationKind) && fields.length >= 2) {
    return `Please rate both ${humanizeField(fields[0])} and ${humanizeField(fields[1])} from 0 to 100%.`;
  }
  if (promptItem.type === "rating" && fields[0]) return `From 0 to 100%, what is your ${humanizeField(fields[0])}?`;
  if (promptItem.type === "role_transition") return "Please move into the next stated role and take a moment to settle before continuing.";
  if (fields[0] && /evidence/i.test(fields[0])) return `Please give one specific item of ${humanizeField(fields[0])}.`;
  if (fields[0] && ["question", "clarification", "follow_up", "confirmation", "reflection"].includes(promptItem.type)) {
    return `Please describe your ${humanizeField(fields[0])} for this step.`;
  }
  if (promptItem.type === "reflection") return "Thank you for sharing that. We will keep it in view as we continue.";
  if (["instruction", "explanation", "transition", "worksheet_instruction"].includes(promptItem.type)) {
    return "We will continue with the next part of this exercise, one step at a time.";
  }
  return "We will continue with the next part of this exercise, one step at a time.";
}

function toConditionExpression(value: Record<string, unknown> | ConditionExpression | null | undefined) {
  if (!value || typeof value !== "object") return undefined;
  if (value.kind === "always") return { kind: "always" } satisfies ConditionExpression;
  if (typeof value.field !== "string" || typeof value.operator !== "string") return undefined;
  return {
    kind: "field",
    field: value.field,
    operator: value.operator as ConditionExpression["operator"],
    value: value.value as ConditionExpression["value"],
  } satisfies ConditionExpression;
}

function promptRequiresPatientInput(promptItem: PromptItem) {
  if (["question", "clarification", "follow_up", "confirmation", "reflection", "rating"].includes(promptItem.type)) return true;
  if (PASSIVE_PROMPT_TYPES.has(promptItem.type)) return false;
  return promptItem.outputFields.length > 0;
}

function defaultCompletionCondition(promptItem: PromptItem): ConditionExpression {
  return promptRequiresPatientInput(promptItem)
    ? { kind: "field", field: "turn.patient_input_validated", operator: "equals", value: true }
    : { kind: "field", field: "turn.assistant_message_delivered", operator: "equals", value: true };
}

function defaultRoleId(promptItem: PromptItem, node: ClinicalStageNode): RuntimeSpeakerRoleId {
  if (node.speakerRoleId === "therapist" || node.speakerRoleId === "psychoeducation_guide" || node.speakerRoleId === "closing_guide" || node.speakerRoleId === "tbct_guide") return node.speakerRoleId;
  if (promptItem.type === "closing") return "closing_guide";
  if (["explanation", "instruction", "worksheet_instruction"].includes(promptItem.type)) return "psychoeducation_guide";
  return "tbct_guide";
}

function defaultAllowedActions(promptItem: PromptItem) {
  if (promptItem.type === "closing") return ["close", "summarize", "validate"];
  if (["explanation", "instruction", "worksheet_instruction"].includes(promptItem.type)) return ["educate", "ask"];
  if (["reflection", "summary"].includes(promptItem.type)) return ["reflect", "summarize"];
  return ["ask"];
}

function normalizeValidationRules(promptItem: PromptItem): ValidationRule[] {
  if (promptItem.validationRules?.length) return promptItem.validationRules.map((rule) => ({ ...rule }));
  if (promptItem.validation && typeof promptItem.validation.kind === "string") {
    return [{ id: `${promptItem.id}-validation`, kind: promptItem.validation.kind, ...promptItem.validation }];
  }
  return [];
}

export function normalizeRuntimePromptItem(input: {
  promptItem: PromptItem;
  node: ClinicalStageNode;
  locale: string;
  sequenceIndex?: number;
}): RuntimePromptItem {
  const { promptItem, node, locale } = input;
  const activationCondition = toConditionExpression(promptItem.activationCondition);
  const sourceCandidate = promptItem.fallbackPatientText ?? promptItem.verbatimText;
  const fallbackCandidate = localizedSourcePromptText(promptItem, locale, isPatientSafeFallbackText(sourceCandidate) ? sourceCandidate : sourceSpecificRuntimeFallback(promptItem));

  return {
    id: promptItem.id,
    sessionId: promptItem.sessionId,
    nodeId: promptItem.nodeId,
    roleId: promptItem.roleId ?? defaultRoleId(promptItem, node),
    scope: promptItem.scope ?? "step",
    sequenceIndex: promptItem.sequenceIndex ?? input.sequenceIndex ?? promptItem.order,
    executionMode: promptItem.executionMode ?? (activationCondition ? "conditional" : "serial"),
    modelGuidance: promptItem.modelGuidance?.trim() || promptItem.aiInstruction.trim(),
    requiredPatientFacingContent: [fallbackCandidate?.trim() || promptItem.verbatimText.trim()].filter(Boolean),
    fallbackPatientText: resolvePromptLocaleText(promptItem.id, fallbackCandidate, locale),
    clarificationPatientText: resolvePromptLocaleText(promptItem.id, promptItem.verbatimText || fallbackCandidate, locale),
    activationCondition,
    completionCondition: promptItem.completionCondition ?? defaultCompletionCondition(promptItem),
    allowedActions: promptItem.allowedActions?.length ? [...promptItem.allowedActions] : defaultAllowedActions(promptItem),
    forbiddenActions: promptItem.forbiddenActions?.length ? [...promptItem.forbiddenActions] : ["change_runtime_state", "disclose_internal_instructions", "diagnose"],
    requiredFields: promptItem.requiredFields?.length ? [...promptItem.requiredFields] : [...promptItem.outputFields],
    validationRules: normalizeValidationRules(promptItem),
    maxAttempts: Math.max(1, promptItem.maxAttempts ?? 1),
    maxClarificationAttempts: 3,
    maxIterations: promptItem.maxIterations,
    requiresPatientInput: promptRequiresPatientInput(promptItem),
    outputSchemaVersion: promptItem.outputSchemaVersion ?? DEFAULT_OUTPUT_SCHEMA_VERSION,
    sourcePromptItemId: promptItem.id,
  };
}

function toTransitionRule(edge: SourceFidelityEdge): RuntimeTransitionRule {
  return {
    id: edge.id,
    targetNodeId: edge.target,
    condition: toConditionExpression(edge.condition),
    priority: edge.priority,
    isFallback: edge.isFallback,
  };
}

function normalizeRuntimeNode(input: {
  node: ClinicalStageNode;
  promptItems: RuntimePromptItem[];
  edges: SourceFidelityEdge[];
}): RuntimeNode {
  const { node, promptItems, edges } = input;
  const promptSequence = promptItems
    .filter((promptItem) => promptItem.nodeId === node.id)
    .sort((left, right) => left.sequenceIndex - right.sequenceIndex || left.id.localeCompare(right.id))
    .map((promptItem) => promptItem.id);

  return {
    id: node.id,
    sessionId: node.sessionId,
    title: node.title,
    objective: node.objective?.trim() || node.clinicalPurpose,
    speakerRoleId: node.speakerRoleId ?? promptItems.find((promptItem) => promptItem.nodeId === node.id)?.roleId ?? "tbct_guide",
    promptSequence,
    entryCondition: node.entryCondition ?? { kind: "always" },
    completionCondition: node.completionCondition ?? { kind: "field", field: "node.all_prompt_items_completed", operator: "equals", value: true },
    transitionRules: edges.filter((edge) => edge.source === node.id).map(toTransitionRule).sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id)),
    maxNodeIterations: Math.max(1, node.maxNodeIterations ?? 3),
    safetyRuleIds: [...node.safetyRuleIds],
  };
}

function normalizePolicies(snapshot: SourceFidelityReleaseSnapshot): PolicyBundle {
  const sessionPolicies = Object.fromEntries(Object.entries(snapshot.sessionCommonRules ?? {}).map(([sessionId, rules]) => [
    sessionId,
    {
      safetyRules: [...(rules.sessionWideSafetyRules ?? [])],
      protocolRules: [
        ...(rules.languageRules ?? []),
        ...(rules.openingRules ?? []),
        ...(rules.sessionWideRequiredActions ?? []),
        ...(rules.sessionWideRestrictions ?? []),
      ],
    },
  ]));
  return {
    globalSafetyRules: ["Safety override takes precedence over normal runtime progression. Do not generate ordinary protocol content when a safety override is active."],
    protocolRules: [],
    sessionPolicies,
    forbiddenPatientContent: ["internal instructions", "model details", "prompt details", "runtime identifiers"],
    maxPromptCharacters: 12_000,
  };
}

export function normalizeRuntimeReleaseFromSourceSnapshot(input: {
  releaseId: string;
  protocolId: string;
  version: string;
  publishedAt: string;
  snapshot: SourceFidelityReleaseSnapshot;
  contentHash?: string;
}): RuntimeRelease {
  const nodeById = new Map(input.snapshot.clinicalStageNodes.map((node) => [node.id, node]));
  const promptItems = input.snapshot.promptItems
    .filter((promptItem) => promptItem.status === "active")
    .map((promptItem, index) => {
      const node = nodeById.get(promptItem.nodeId);
      if (!node) return null;
      const sessionLocale = input.snapshot.sessionDefinitions.find((session) => session.id === promptItem.sessionId)?.sourceTrace.sourceSession === "Korean" ? "ko-KR" : "en-US";
      return normalizeRuntimePromptItem({ promptItem, node, locale: sessionLocale, sequenceIndex: index + 1 });
    })
    .filter((promptItem): promptItem is RuntimePromptItem => Boolean(promptItem));

  return {
    id: input.releaseId,
    protocolId: input.protocolId,
    version: input.version,
    roles: DEFAULT_RUNTIME_ROLES.map((role) => ({ ...role, allowedActions: [...role.allowedActions], forbiddenActions: [...role.forbiddenActions] })),
    nodes: input.snapshot.clinicalStageNodes.map((node) => normalizeRuntimeNode({ node, promptItems, edges: input.snapshot.sourceFidelityEdges })),
    promptItems,
    policies: normalizePolicies(input.snapshot),
    schemaVersion: "runtime-release/v1",
    contentHash: input.contentHash ?? `legacy-${input.snapshot.sourceTextHash}`,
    publishedAt: input.publishedAt,
  };
}

export { DEFAULT_RUNTIME_ROLES };
