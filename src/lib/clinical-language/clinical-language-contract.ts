import { z } from "zod";

export const clinicalProviderNames = ["mock", "anthropic"] as const;
export type ClinicalProviderName = (typeof clinicalProviderNames)[number];

export const safetySignalSchema = z.object({
  type: z.enum(["suicidal_ideation", "self_harm", "harm_to_others", "immediate_danger", "crisis_distress", "severe_dissociation", "emotional_flooding", "other"]),
  evidence: z.string(),
  confidence: z.number().min(0).max(1),
  immediacy: z.enum(["none", "unclear", "possible", "immediate"]),
});

export const clinicalProviderResponseSchema = z.object({
  requestId: z.string(),
  patientMessage: z.string().min(1),
  detectedLanguage: z.string().min(1),
  completionStatus: z.enum(["incomplete", "complete", "needs_clarification", "safety_review", "safety_hold"]),
  extractedFields: z.record(z.unknown()),
  safetySignals: z.array(safetySignalSchema),
  nextActionRecommendation: z.enum(["stay", "advance", "clarify", "safety"]),
  providerMetadata: z.object({
    provider: z.enum(clinicalProviderNames),
    model: z.string().optional(),
    providerRequestId: z.string().optional(),
    latencyMs: z.number().optional(),
  }),
});

export const clinicalProviderRequestSchema = z.object({
  requestId: z.string(),
  idempotencyKey: z.string(),
  protocolId: z.string(),
  protocolVersion: z.string(),
  sessionPlanEntryId: z.string(),
  sessionId: z.string(),
  sessionNumber: z.number(),
  nodeId: z.string(),
  nodeTitle: z.string(),
  clinicalPurpose: z.string(),
  promptItemId: z.string(),
  promptItemType: z.string(),
  editableText: z.string(),
  aiInstruction: z.string(),
  activationCondition: z.record(z.unknown()).nullable(),
  outputFields: z.array(z.string()),
  validation: z.record(z.unknown()).nullable(),
  completionEffect: z.record(z.unknown()).nullable(),
  participantMessage: z.string(),
  detectedLanguage: z.string().optional(),
  relevantFields: z.record(z.unknown()),
  recentMessages: z.array(z.object({ role: z.enum(["participant", "assistant"]), content: z.string() })),
  safetyContext: z.object({
    activeSafetyRuleIds: z.array(z.string()),
    currentSafetyStatus: z.string(),
  }),
});

export type ClinicalProviderRequest = z.infer<typeof clinicalProviderRequestSchema>;
export type ClinicalProviderResponse = z.infer<typeof clinicalProviderResponseSchema>;
