import { sourceText } from "@/lib/protocol/source-fidelity-catalog";
import type { SessionSourceMetadata, SessionSpec } from "@/lib/protocol/source-fidelity-catalog";

const metadata: SessionSourceMetadata = {
  number: 7,
  id: "tbct-s07",
  title: "Consensual Role-Play (CRP)",
  techniqueName: "Consensual Role-Play (CRP)",
  acronym: "CRP",
  sourceLineStart: 1276,
  sourceLineEnd: 1536,
  sourceSessionHash: "acba4ae74192dc898936ec6a7fb3d927577e5f7eefddb564a116aef967fb3e2b",
  contextRange: [1289, 1317],
  roleRange: [1289, 1317],
  languageRange: [1319, 1351],
  openingRange: [1475, 1479],
  requiredActionsRange: [1370, 1477],
  restrictionsRange: [1478, 1536],
  safetyRange: [1496, 1536],
  reviewRanges: [
    {
      range: [1328, 1351],
      warning: "The supplied multilingual glossary contains visible encoding/transcription corruption. Preserve it verbatim and require source-owner review.",
    },
    {
      range: [1491, 1536],
      warning: "The supplied failure-mode excerpt contains visible encoding/transcription corruption. Preserve it verbatim and require source-owner review.",
    },
  ],
};

export const spec: SessionSpec = {
  metadata,
  nodes: [
    {
      slug: "opening-consent",
      title: "Session Opening and Consent",
      type: "session_start",
      source: [1475, 1479],
      requiredFields: ["crpConsent"],
      safetyRuleIds: ["TBCT-S07-CRISIS-STOP"],
      restrictions: [sourceText([1475, 1479])],
      prompts: [
        { slug: "crp-offer", type: "opening", source: [1475, 1479], marker: "I'd like to propose", outputFields: ["crpConsent"], validation: { kind: "informed_consent", noPressure: true } },
        { slug: "crp-consent", type: "confirmation", source: [1475, 1479], marker: "Would you like to try it", outputFields: ["crpConsent"], validation: { kind: "boolean" } },
      ],
    },
    {
      slug: "language-and-principles",
      title: "Language Lock and Core Principles",
      type: "orientation",
      source: [1289, 1369],
      requiredFields: ["sessionLanguage", "languageLocked", "crpPrinciplesAcknowledged"],
      restrictions: [sourceText([1319, 1369])],
      prompts: [
        { slug: "language-lock", type: "instruction", source: [1319, 1326], outputFields: ["sessionLanguage", "languageLocked"], validation: { kind: "language_lock_from_first_substantive_message" } },
        { slug: "both-parts-healthy", type: "explanation", source: [1353, 1369], marker: "Reason and Emotion are two functions", outputFields: ["crpPrinciplesAcknowledged"] },
        { slug: "live-avoidance-notice", type: "clarification", source: [1353, 1369], marker: "I noticed you went quiet", activationCondition: { field: "liveAvoidanceObserved", operator: "equals", value: true }, outputFields: ["liveAvoidanceAcknowledged"] },
      ],
    },
    {
      slug: "step-zero-psychoeducation",
      title: "Step 0 - Psychoeducation",
      type: "orientation",
      source: [1370, 1379],
      requiredFields: ["ambivalenceAcknowledged"],
      prompts: [
        { slug: "ambivalence-normalization", type: "explanation", source: [1370, 1379], outputFields: ["ambivalenceAcknowledged"] },
      ],
    },
    {
      slug: "decisional-balance",
      title: "Step 1 - Decisional Balance",
      type: "question",
      source: [1380, 1391],
      requiredFields: ["desiredOrFearedAction", "disadvantages", "advantages"],
      restrictions: [sourceText([1380, 1391])],
      prompts: [
        { slug: "action-in-own-words", type: "question", source: [1380, 1391], outputFields: ["desiredOrFearedAction"], validation: { kind: "participant_owned_text" } },
        { slug: "disadvantages-first", type: "question", source: [1380, 1391], marker: "What are the downsides", outputFields: ["disadvantages"], validation: { kind: "array", disadvantagesBeforeAdvantages: true, maxItems: 7 } },
        { slug: "advantages-second", type: "question", source: [1380, 1391], marker: "What are the upsides", outputFields: ["advantages"], validation: { kind: "array", maxItems: 7, afterField: "disadvantages" } },
      ],
    },
    {
      slug: "weigh-ambivalence",
      title: "Step 2 - Weigh Ambivalence",
      type: "assessment",
      source: [1392, 1407],
      requiredFields: ["emotionDisadvantageWeight", "reasonAdvantageWeight"],
      restrictions: [sourceText([1392, 1407])],
      prompts: [
        { slug: "emotion-weight", type: "rating", source: [1392, 1407], marker: "Emotion", outputFields: ["emotionDisadvantageWeight"], validation: { kind: "rating", min: 0, max: 100, perspective: "emotion" } },
        { slug: "reason-weight", type: "rating", source: [1392, 1407], marker: "Reason", outputFields: ["reasonAdvantageWeight"], validation: { kind: "rating", min: 0, max: 100, perspective: "reason" } },
      ],
    },
    {
      slug: "empty-chair-dialogue",
      title: "Step 3 - Empty-Chair Dialogue",
      type: "dialogue",
      source: [1408, 1432],
      requiredFields: ["emotionReasonDialogue"],
      restrictions: [sourceText([1408, 1432])],
      prompts: [
        { slug: "chair-arrangement", type: "role_transition", source: [1408, 1432], outputFields: ["chairArrangementConfirmed"], validation: { kind: "role_arrangement_confirmed" } },
        { slug: "emotion-to-reason", type: "role_transition", source: [1408, 1432], marker: "Emotion, speak directly to Reason", outputFields: ["emotionReasonDialogue"], validation: { kind: "array", therapistSilence: true, maxItems: 8 } },
        {
          slug: "continue-dialogue",
          type: "follow_up",
          source: [1408, 1432],
          marker: "Is there more",
          outputFields: ["emotionReasonDialogue"],
          validation: { kind: "array", maxItems: 8 },
          // Keeps alternating exchanges going until at least two have
          // happened (or the participant says there is nothing more),
          // rather than accepting one "Is there more?" answer and moving on.
          executionMode: "repeat_until",
          maxIterations: 4,
          completionCondition: { kind: "field", field: "emotionReasonDialogueSufficient", operator: "equals", value: true },
        },
      ],
    },
    {
      slug: "consensus-chair",
      title: "Step 4 - Consensus Chair",
      type: "dialogue",
      source: [1433, 1441],
      requiredFields: ["consensusLearning"],
      prompts: [
        { slug: "consensus-transition", type: "role_transition", source: [1433, 1441], outputFields: ["consensusChairReady"], validation: { kind: "role_transition_confirmed" } },
        { slug: "consensus-learning", type: "question", source: [1433, 1441], marker: "What did you learn", outputFields: ["consensusLearning"] },
        { slug: "consensus-surprise", type: "question", source: [1433, 1441], marker: "What surprised you", outputFields: ["consensusLearning"] },
      ],
    },
    {
      slug: "consensus-reweight",
      title: "Step 5 - Reassess Weights",
      type: "assessment",
      source: [1442, 1449],
      requiredFields: ["consensusAdvantageWeight", "consensusDisadvantageWeight"],
      restrictions: [sourceText([1442, 1449])],
      prompts: [
        { slug: "consensus-weights", type: "rating", source: [1442, 1449], marker: "re-weigh advantages", outputFields: ["consensusAdvantageWeight", "consensusDisadvantageWeight"], validation: { kind: "consensus_weights", noEditorializing: true } },
      ],
    },
    {
      slug: "decision",
      title: "Step 6 - Decision",
      type: "assessment",
      source: [1450, 1461],
      requiredFields: ["implementationReadiness"],
      restrictions: [sourceText([1450, 1461])],
      prompts: [
        { slug: "readiness-decision", type: "question", source: [1450, 1461], marker: "Are you ready to implement", outputFields: ["implementationReadiness"], validation: { kind: "enum", values: ["ready", "not_ready"], notReadyIsValid: true, forbiddenValues: ["I will do it"] } },
        { slug: "prepare-later", type: "follow_up", source: [1450, 1461], marker: "Would you like to be ready later", activationCondition: { field: "implementationReadiness", operator: "equals", value: "not_ready" }, outputFields: ["laterReadinessPreparation"] },
      ],
    },
    {
      slug: "action-plan",
      title: "Step 7 - Action Plan",
      type: "activity",
      source: [1462, 1477],
      requiredFields: ["proposedActions", "possibleObstacles", "obstacleSolutions", "implementationPlan", "supportPeople", "followUpPlan"],
      restrictions: [sourceText([1462, 1477])],
      prompts: [
        // "question", not "worksheet_instruction": each of these six fields
        // is participant-owned and must actually be supplied by them.
        // worksheet_instruction is a passive type that completes as soon as
        // the assistant delivers it, so all six fields were structurally
        // guaranteed to stay empty regardless of what the patient typed.
        { slug: "proposed-actions", type: "question", source: [1462, 1477], outputFields: ["proposedActions"], validation: { kind: "action_plan_field", fieldIndex: 1, participantOwned: true } },
        { slug: "possible-obstacles", type: "question", source: [1462, 1477], outputFields: ["possibleObstacles"], validation: { kind: "action_plan_field", fieldIndex: 2, participantOwned: true } },
        { slug: "obstacle-solutions", type: "question", source: [1462, 1477], outputFields: ["obstacleSolutions"], validation: { kind: "action_plan_field", fieldIndex: 3, participantOwned: true } },
        { slug: "implementation-plan", type: "question", source: [1462, 1477], outputFields: ["implementationPlan"], validation: { kind: "action_plan_field", fieldIndex: 4, participantOwned: true } },
        { slug: "support-people", type: "question", source: [1462, 1477], outputFields: ["supportPeople"], validation: { kind: "action_plan_field", fieldIndex: 5, participantOwned: true } },
        { slug: "follow-up", type: "question", source: [1462, 1477], outputFields: ["followUpPlan"], validation: { kind: "action_plan_field", fieldIndex: 6, participantOwned: true, assistantMustNotSupply: true } },
      ],
    },
    {
      slug: "closing",
      title: "Closing and Failure-Mode Guardrails",
      type: "session_complete",
      source: [1478, 1536],
      safetyRuleIds: ["TBCT-S07-CRISIS-STOP"],
      restrictions: [sourceText([1478, 1536])],
      terminal: true,
      prompts: [
        { slug: "plan-summary", type: "closing", source: [1478, 1536], outputFields: ["crpPlanSummary"], validation: { kind: "plan_summary_without_praise_or_persuasion" }, completionEffect: { type: "complete_session" } },
      ],
    },
    {
      slug: "safety-pause",
      title: "Safety Pause and Support",
      type: "clinician_escalation",
      source: [1496, 1536],
      safetyRuleIds: ["TBCT-S07-CRISIS-STOP"],
      terminal: true,
      prompts: [
        { slug: "stop-crp", type: "instruction", source: [1496, 1536], outputFields: ["safetyEscalation"], completionEffect: { type: "pause_session" }, safetyRuleIds: ["TBCT-S07-CRISIS-STOP"] },
      ],
    },
  ],
  extraEdges: [
    { sourceSlug: "opening-consent", targetSlug: "safety-pause", edgeType: "safety", source: [1496, 1536], label: "Crisis signal", condition: { field: "crisisSignal", operator: "equals", value: true }, priority: 1 },
  ],
};
