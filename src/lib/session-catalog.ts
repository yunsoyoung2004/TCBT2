import type { ProtocolGraphEdge, ProtocolGraphNode } from "@/types/protocol-runtime";
import { REAL_SESSION_03_EDGES, REAL_SESSION_03_ID, REAL_SESSION_03_NODES, REAL_SESSION_03_PROTOCOL_ID, REAL_SESSION_03_SESSION, REAL_SESSION_03_TITLE, REAL_SESSION_03_VERSION } from "@/lib/protocol/session-03-real";
import {
  CANONICAL_PROTOCOL_ID,
  CANONICAL_PROMPT_ITEMS,
  CANONICAL_SESSION_COMMON_RULES,
  CANONICAL_SESSION_DEFINITIONS,
  CANONICAL_SESSION_PLAN,
  CANONICAL_SOURCE_EDGES,
  CANONICAL_SOURCE_VERSION,
  CANONICAL_STAGE_NODES,
  resolveCanonicalSessionId,
} from "@/lib/protocol/source-fidelity-catalog";
import { TBCT_SOURCE_TEXT_HASH } from "@/lib/protocol/tbct-source-text.generated";
import type { ConditionExpression, PromptExecutionMode, PromptScope, SourceFidelityBackup, SourceTrace as CanonicalSourceTrace, ValidationRule } from "@/lib/protocol/source-fidelity-types";
import type { SourceFidelityReleaseSnapshot } from "@/types/protocol-runtime";

export type SessionPlanStatus = "draft" | "validated" | "released";
export type PromptItemType = "instruction" | "opening" | "explanation" | "question" | "clarification" | "follow_up" | "confirmation" | "reflection" | "rating" | "assessment" | "summary" | "transition" | "closing" | "role_transition" | "worksheet_instruction";
export type SourceTrace = {
  sourceDocument: string;
  sourceSection: string;
  importedVersion: string;
  sessionNumber?: number;
  sourcePage?: number;
  sourceBlockId?: string;
  sourceSession?: string;
  sourceLineStart?: number;
  sourceLineEnd?: number;
  sourceTextHash?: string;
  sourceSessionHash?: string;
  rawSourceExcerpt?: string;
  reviewWarnings?: string[];
};
export type SessionDefinitionStatus = "draft" | "reviewed" | "released";
export type SourceFidelityStatus = "exact" | "structured_from_source" | "review_required" | "source_missing";
export type NodeInspectorTab = "prompt" | "flow" | "data" | "safety" | "qa";
export type ConditionGroup = { allOf?: Array<{ key: string; operator: string; value?: string | number | boolean | string[] }>; anyOf?: Array<{ key: string; operator: string; value?: string | number | boolean | string[] }>; description?: string };
export type CaptureField = { id: string; key: string; label: string; type: "string" | "number" | "boolean" | "array" | "object" | "rating" | "enum"; required: boolean; min?: number; max?: number; minItems?: number; maxItems?: number; preserveVerbatim: boolean; normalizedFieldKey?: string; sourceTurnRequired: boolean };
export type NodeTransition = { id: string; sourceNodeId: string; targetNodeId: string; label: string; condition?: ConditionGroup; priority: number; isFallback: boolean; transitionType: "default" | "conditional" | "skip" | "return" | "safety" | "pause" | "resume" };
export type SafetyRule = { id: string; name: string; scope: "global" | "session" | "node"; description: string; trigger: ConditionGroup; severity: "warning" | "pause" | "escalate" | "terminate"; assistantAction: string; routeToNodeId?: string; requiresClinicianReview: boolean; resumeCondition?: ConditionGroup };
export type PromptVariantKind = "primary" | "alternative" | "probe" | "clarification" | "reflection" | "redirect" | "fallback" | "closing";
export type PromptVariant = { id: string; label: string; kind: PromptVariantKind; content: string; trigger?: ConditionGroup; priority: number; isRequired: boolean };
export type SessionCommonRules = {
  sessionTitle: string;
  techniqueName: string;
  roleAndStance: string;
  sessionObjective: string;
  clinicalContext: string;
  previousSessionContext: string;
  languageAndTerminologyRules: string;
  toneAndInteractionRules: string;
  sessionWideRequiredActions: string[];
  sessionWideRestrictions: string[];
  safetyAndEscalationRules: string;
  defaultModalityRules: string[];
  version: string;
  status: "incomplete" | "clinical_review" | "safety_review" | "validated" | "published";
  sourceTrace?: SourceTrace;
  sourceFidelityStatus?: SourceFidelityStatus;
  languageRules?: string[];
  openingRules?: string[];
  sessionWideSafetyRules?: string[];
};

export interface SessionPlanEntry { entryId: string; sessionId: string; order: number; active: boolean; occurrence: number; label: string; }
export interface SessionPlan { id: string; protocolId: string; orderedEntries: SessionPlanEntry[]; startingEntryId: string; status: SessionPlanStatus; version: string; createdAt: string; updatedAt: string; }
export interface SessionDefinition { id: string; protocolId: string; number: number; title: string; technique: string; clinicalPurpose: string; roleInstruction: string; restrictions: string[]; languageRules: string[]; status: SessionDefinitionStatus; sourceTrace: SourceTrace; sourceFidelityStatus?: SourceFidelityStatus; nodeCount: number; promptCount: number; validationStatus: "review" | "ready" | "blocked"; }
export interface ClinicalStageNode { id: string; protocolId: string; sessionId: string; title: string; type: string; clinicalPurpose: string; objective?: string; speakerRoleId?: string; entryCondition?: ConditionExpression; completionCondition?: ConditionExpression; maxNodeIterations?: number; position: { x: number; y: number }; promptItemIds?: string[]; requiredFields: string[]; completionRule: object; branchRules: object[]; restrictions: string[]; safetyRuleIds: string[]; sourceTrace: SourceTrace; sourceFidelityStatus?: SourceFidelityStatus; status: string; }
export interface PromptItem { id: string; protocolId: string; sessionId: string; nodeId: string; order: number; sequenceIndex?: number; type: PromptItemType; status: "active" | "disabled" | "deprecated"; verbatimText: string; editableText: string; aiInstruction: string; modelGuidance?: string; fallbackPatientText?: string; roleId?: string; scope?: PromptScope; executionMode?: PromptExecutionMode; activationCondition: object | null; completionCondition?: ConditionExpression; outputFields: string[]; requiredFields?: string[]; validation: object | null; validationRules?: ValidationRule[]; completionEffect: object | null; allowedActions?: string[]; forbiddenActions?: string[]; maxAttempts?: number; maxIterations?: number; outputSchemaVersion?: string; restrictions?: string[]; safetyRuleIds?: string[]; sourceTrace: SourceTrace; sourceFidelityStatus?: SourceFidelityStatus; origin?: "source_imported" | "imported" | "custom"; sourceHash?: string; sourceUpdateAvailable?: boolean; migrationHistory?: Array<{ migrationVersion: string; previousId?: string; mapping: "exact" | "conflict" | "deprecated" | "source_changed"; at: string }>; createdAt: string; updatedAt: string; updatedBy: string; }

type SessionSeed = { definition: SessionDefinition; nodes: ClinicalStageNode[]; promptItems: PromptItem[] };

const STORAGE_KEY = "tbct.session-catalog.v2";
const now = () => new Date().toISOString();

const defaultSessionCommonRules: Record<string, SessionCommonRules> = {
  "tbct-session-03": {
    sessionTitle: REAL_SESSION_03_TITLE,
    techniqueName: "Intra-TR",
    roleAndStance: "Therapist-guided structured self-monitoring",
    sessionObjective: "Complete the intrapersonal thought record safely and stepwise.",
    clinicalContext: "Participant has already oriented to TBCT and is now working on an individualized thought record.",
    previousSessionContext: "Session 02 established problems and goals.",
    languageAndTerminologyRules: "Preserve participant wording. Do not simplify technical terms when the manual requires exact labels.",
    toneAndInteractionRules: "One question at a time. Neutral, supportive, non-leading.",
    sessionWideRequiredActions: ["Ask one question at a time", "Preserve verbatim participant wording", "Confirm completion before advancing"],
    sessionWideRestrictions: ["Do not skip safety check", "Do not invent evidence", "Do not reveal hidden scoring logic"],
    safetyAndEscalationRules: "Escalate on acute self-harm, psychosis, or severe deterioration signals.",
    defaultModalityRules: ["text"],
    version: REAL_SESSION_03_VERSION,
    status: "clinical_review",
  },
};

const sessionOutlines: Record<string, Array<{ id: string; title: string; type: string; clinicalPurpose: string; requiredFields: string[] }>> = {
  "tbct-session-01": [
    { id: "s01-opening", title: "Opening and Current Situation", type: "orientation", clinicalPurpose: "Open the session and situate the participant in the current moment.", requiredFields: ["currentSituation"] },
    { id: "s01-situation-thought", title: "Situation versus Thought", type: "question", clinicalPurpose: "Separate facts from interpretations.", requiredFields: ["situation", "thought"] },
    { id: "s01-three-person", title: "Three-Person Example", type: "explanation", clinicalPurpose: "Use an example to make the TBCT cycle concrete.", requiredFields: ["exampleSummary"] },
    { id: "s01-cycle", title: "Personal Cognitive Cycle", type: "summary", clinicalPurpose: "Link situation, thought, emotion, and behavior.", requiredFields: ["cognitiveCycle"] },
    { id: "s01-summary", title: "Participant Summary", type: "summary", clinicalPurpose: "Participant summarizes the learning.", requiredFields: ["participantSummary"] },
    { id: "s01-distortions", title: "Cognitive Distortions", type: "assessment", clinicalPurpose: "Identify common distortion patterns.", requiredFields: ["cognitiveDistortions"] },
    { id: "s01-closing", title: "Closing and Daily Observation", type: "closing", clinicalPurpose: "Close with daily observation guidance.", requiredFields: ["dailyObservation"] },
  ],
  "tbct-session-02": [
    { id: "s02-opening", title: "Opening", type: "orientation", clinicalPurpose: "Open the session and transition into problem work.", requiredFields: ["openingCheckIn"] },
    { id: "s02-problems", title: "Problem Elicitation", type: "question", clinicalPurpose: "Elicit the most relevant current problem.", requiredFields: ["problemStatement"] },
    { id: "s02-hidden", title: "Hidden X/Y/Z Problems", type: "question", clinicalPurpose: "Uncover hidden or secondary problems.", requiredFields: ["hiddenProblems"] },
    { id: "s02-problem-rating", title: "Problem Rating", type: "assessment", clinicalPurpose: "Rate problem severity and urgency.", requiredFields: ["problemSeverity"] },
    { id: "s02-problem-summary", title: "Problem Summary", type: "summary", clinicalPurpose: "Summarize the problem hierarchy.", requiredFields: ["problemSummary"] },
    { id: "s02-goals", title: "Goal Elicitation", type: "question", clinicalPurpose: "Elicit concrete treatment goals.", requiredFields: ["goalStatement"] },
    { id: "s02-goal-rating", title: "Goal Rating", type: "assessment", clinicalPurpose: "Rate the goal clarity and relevance.", requiredFields: ["goalRating"] },
    { id: "s02-goal-summary", title: "Goal Summary and Closing", type: "closing", clinicalPurpose: "Confirm the goal plan and close.", requiredFields: ["goalSummary"] },
  ],
  "tbct-session-03": [
    { id: "session_start", title: "Safety Check", type: "safety_check", clinicalPurpose: "Urgent risk and safety check.", requiredFields: ["safetyCheck"] },
    { id: "intra_tr_introduction", title: "Introduction", type: "orientation", clinicalPurpose: "Introduce the thought record.", requiredFields: ["sessionIntroduction"] },
    { id: "q1_situation", title: "Situation and Automatic Thought", type: "question", clinicalPurpose: "Elicit a recent situation and automatic thought.", requiredFields: ["situation", "automaticThought"] },
    { id: "q3a_primary_emotion", title: "Emotion, Behavior and Body", type: "assessment", clinicalPurpose: "Capture emotion, behavior, and body sensations.", requiredFields: ["primaryEmotion", "behavior", "bodySensations"] },
    { id: "participant_summary_checkpoint", title: "Participant Summary", type: "summary", clinicalPurpose: "Participant summarizes the episode.", requiredFields: ["participantSummary"] },
    { id: "q5_behavior_pros", title: "Pros, Cons and Cognitive Distortion", type: "question", clinicalPurpose: "Examine pros/cons and distortion labels.", requiredFields: ["behaviorPros", "behaviorCons", "cognitiveDistortion"] },
    { id: "q8_evidence_for", title: "Evidence Examination", type: "question", clinicalPurpose: "Gather evidence for and against the thought.", requiredFields: ["evidenceFor", "evidenceAgainst"] },
    { id: "q10a_balanced_conclusion", title: "Balanced Conclusion", type: "question", clinicalPurpose: "Write a balanced conclusion.", requiredFields: ["balancedConclusion", "conclusionBeliefPercent"] },
    { id: "q11_emotion_intensities", title: "Emotional and Behavioral Re-evaluation", type: "assessment", clinicalPurpose: "Re-rate emotion and behavioral impact.", requiredFields: ["newEmotionIntensities", "revisedATBeliefPercent"] },
    { id: "closing", title: "Final Evaluation and Closing", type: "closing", clinicalPurpose: "Close and confirm next steps.", requiredFields: ["closingSummary"] },
  ],
  "tbct-session-04": [
    { id: "s04-safety", title: "Safety and Situation", type: "safety_check", clinicalPurpose: "Check safety and identify the interpersonal trigger.", requiredFields: ["safetyCheck", "triggeringSituation"] },
    { id: "s04-thought-emotion", title: "Participant Thought and Emotion", type: "question", clinicalPurpose: "Elicit the participant's thoughts and emotions.", requiredFields: ["participantThought", "participantEmotion"] },
    { id: "s04-body-behavior", title: "Participant Behavior and Body", type: "assessment", clinicalPurpose: "Describe observable behavior and body response.", requiredFields: ["participantBehavior", "bodySensations"] },
    { id: "s04-other-perspective", title: "Other Person Perspective", type: "reflection", clinicalPurpose: "Consider the other person's perspective.", requiredFields: ["otherPersonPerspective"] },
    { id: "s04-feedback-loop", title: "Interpersonal Feedback Loop", type: "summary", clinicalPurpose: "Map the loop between people.", requiredFields: ["feedbackLoop"] },
    { id: "s04-locus", title: "Locus of Control", type: "assessment", clinicalPurpose: "Clarify control and responsibility.", requiredFields: ["locusOfControl"] },
    { id: "s04-rerating", title: "Re-evaluation", type: "assessment", clinicalPurpose: "Re-rate the interpersonal thought.", requiredFields: ["revisedBelief", "emotionIntensities"] },
    { id: "s04-action", title: "Action Plan", type: "transition", clinicalPurpose: "Plan next interpersonal action.", requiredFields: ["actionPlan"] },
    { id: "s04-closing", title: "Final Check and Closing", type: "closing", clinicalPurpose: "Confirm learning and close.", requiredFields: ["closingSummary"] },
  ],
  "tbct-session-05": [
    { id: "s05-guilt-shame", title: "Baseline Guilt and Shame", type: "assessment", clinicalPurpose: "Record initial guilt and shame levels.", requiredFields: ["guilt", "shame"] },
    { id: "s05-language", title: "Language Framing", type: "explanation", clinicalPurpose: "Use participation language carefully.", requiredFields: ["framingSummary"] },
    { id: "s05-contributor", title: "Contributor Identification", type: "question", clinicalPurpose: "Identify contributing factors.", requiredFields: ["contributors"] },
    { id: "s05-ratings", title: "Initial Participation Ratings", type: "assessment", clinicalPurpose: "Rate participation across factors.", requiredFields: ["participationRatings"] },
    { id: "s05-socratic", title: "Socratic Deepening", type: "question", clinicalPurpose: "Explore the ratings more deeply.", requiredFields: ["deepeningResponses"] },
    { id: "s05-rerating", title: "Re-rating Rounds", type: "assessment", clinicalPurpose: "Repeat rating after reflection.", requiredFields: ["reratingRounds"] },
    { id: "s05-final-emotion", title: "Final Guilt and Shame", type: "summary", clinicalPurpose: "Re-check guilt and shame.", requiredFields: ["finalGuilt", "finalShame"] },
    { id: "s05-values", title: "Values and Residual Shame", type: "reflection", clinicalPurpose: "Connect values and lingering shame.", requiredFields: ["values", "residualShame"] },
    { id: "s05-closing", title: "Summary and Closing", type: "closing", clinicalPurpose: "Summarize participation work and close.", requiredFields: ["closingSummary"] },
  ],
  "tbct-session-06": [
    { id: "s06-id", title: "Symptom and Avoidance Identification", type: "question", clinicalPurpose: "Identify symptoms and avoidance patterns.", requiredFields: ["symptoms", "avoidance"] },
    { id: "s06-item-expansion", title: "Item Expansion and Safety-Behavior Inversion", type: "question", clinicalPurpose: "Expand the hierarchy and identify safety behaviors.", requiredFields: ["expandedItems", "safetyBehaviors"] },
    { id: "s06-color-scale", title: "Color Scale and Calibration", type: "assessment", clinicalPurpose: "Calibrate the color scale.", requiredFields: ["colorCalibration"] },
    { id: "s06-item-rating", title: "Item Rating", type: "assessment", clinicalPurpose: "Rate each symptom item.", requiredFields: ["itemRatings"] },
    { id: "s06-green-homework", title: "Green Homework Selection", type: "transition", clinicalPurpose: "Choose a green homework task.", requiredFields: ["homeworkSelection"] },
    { id: "s06-exposure", title: "Exposure Principles", type: "explanation", clinicalPurpose: "Explain exposure principles.", requiredFields: ["exposurePrinciples"] },
    { id: "s06-relief", title: "Relief versus Overcoming", type: "reflection", clinicalPurpose: "Differentiate relief from overcoming.", requiredFields: ["reliefVsOvercoming"] },
    { id: "s06-safety-behavior", title: "Safety Behavior Conceptualization", type: "summary", clinicalPurpose: "Formulate safety behavior links.", requiredFields: ["safetyBehaviorConcept"] },
    { id: "s06-assumption", title: "Underlying Assumption and Circuit 2", type: "question", clinicalPurpose: "Map the underlying assumption.", requiredFields: ["underlyingAssumption"] },
    { id: "s06-closing", title: "Worksheet and Closing", type: "closing", clinicalPurpose: "Close the worksheet and session.", requiredFields: ["closingSummary"] },
  ],
  "tbct-session-07": [
    { id: "s07-consent", title: "Consent and Ambivalence", type: "opening", clinicalPurpose: "Secure consent and explore ambivalence.", requiredFields: ["consent", "ambivalence"] },
    { id: "s07-pros-cons", title: "Disadvantages and Advantages", type: "question", clinicalPurpose: "List disadvantages and advantages.", requiredFields: ["advantages", "disadvantages"] },
    { id: "s07-weights", title: "Reason and Emotion Weights", type: "assessment", clinicalPurpose: "Weight reason and emotion.", requiredFields: ["reasonWeight", "emotionWeight"] },
    { id: "s07-chair-setup", title: "Chair Setup", type: "instruction", clinicalPurpose: "Set up the chair sequence.", requiredFields: ["chairSetup"] },
    { id: "s07-emotion-chair", title: "Emotion Chair", type: "reflection", clinicalPurpose: "Speak from the emotion chair.", requiredFields: ["emotionChair"] },
    { id: "s07-reason-chair", title: "Reason Chair", type: "reflection", clinicalPurpose: "Speak from the reason chair.", requiredFields: ["reasonChair"] },
    { id: "s07-dialogue-loop", title: "Dialogue Loop", type: "follow_up", clinicalPurpose: "Move between chairs in a loop.", requiredFields: ["dialogueLoop"] },
    { id: "s07-consensus", title: "Consensus Chair", type: "summary", clinicalPurpose: "Synthesize a consensus position.", requiredFields: ["consensus"] },
    { id: "s07-readiness", title: "Readiness Decision", type: "assessment", clinicalPurpose: "Check readiness to proceed.", requiredFields: ["readiness"] },
    { id: "s07-action", title: "Action Plan and Follow-up", type: "transition", clinicalPurpose: "Plan next actions and follow-up.", requiredFields: ["actionPlan"] },
    { id: "s07-closing", title: "Closing", type: "closing", clinicalPurpose: "Close the role-play session.", requiredFields: ["closingSummary"] },
  ],
  "tbct-session-08": [
    { id: "s08-trigger", title: "Trigger and Core Belief Identification", type: "question", clinicalPurpose: "Identify the trigger and core belief.", requiredFields: ["trigger", "coreBelief"] },
    { id: "s08-courtroom", title: "Courtroom Orientation", type: "instruction", clinicalPurpose: "Orient the participant to the courtroom frame.", requiredFields: ["courtroomOrientation"] },
    { id: "s08-defendant", title: "Defendant Position", type: "reflection", clinicalPurpose: "State the defendant position.", requiredFields: ["defendantPosition"] },
    { id: "s08-prosecutor", title: "Prosecutor Case", type: "question", clinicalPurpose: "State the prosecutor case.", requiredFields: ["prosecutorCase"] },
    { id: "s08-defense", title: "Defense Case", type: "question", clinicalPurpose: "State the defense case.", requiredFields: ["defenseCase"] },
    { id: "s08-rebuttal", title: "Rebuttal and Surrebuttal", type: "follow_up", clinicalPurpose: "Handle rebuttal and surrebuttal.", requiredFields: ["rebuttal", "surrebuttal"] },
    { id: "s08-jury", title: "Jury Review", type: "summary", clinicalPurpose: "Review the evidence like a jury.", requiredFields: ["juryReview"] },
    { id: "s08-verdict", title: "Verdict", type: "summary", clinicalPurpose: "Render the verdict.", requiredFields: ["verdict"] },
    { id: "s08-ratings", title: "Post-Verdict Ratings", type: "assessment", clinicalPurpose: "Rate belief after verdict.", requiredFields: ["postVerdictRatings"] },
    { id: "s08-debrief", title: "Debrief", type: "summary", clinicalPurpose: "Debrief the trial.", requiredFields: ["debrief"] },
    { id: "s08-positive-belief", title: "Positive Belief and Appeal Preparation", type: "transition", clinicalPurpose: "Prepare the appeal and positive belief shift.", requiredFields: ["positiveBelief", "appealPreparation"] },
    { id: "s08-closing", title: "Final Ratings and Closing", type: "closing", clinicalPurpose: "Close the trial session.", requiredFields: ["closingSummary"] },
  ],
};

const sessionSourceTraces: Record<string, SourceTrace> = {
  "tbct-session-01": { sourceDocument: "TBCT Session 01 Orientation Notes", sessionNumber: 1, sourceSection: "Session 01", importedVersion: "v0.1" },
  "tbct-session-02": { sourceDocument: "Session 02 Therapist Intervention Manual", sessionNumber: 2, sourceSection: "Session 02", importedVersion: "v0.1" },
  "tbct-session-03": { sourceDocument: REAL_SESSION_03_TITLE, sessionNumber: 3, sourceSection: "Session 03", importedVersion: REAL_SESSION_03_VERSION },
  "tbct-session-04": { sourceDocument: "TBCT Session 04 Interpersonal Thought Record", sessionNumber: 4, sourceSection: "Session 04", importedVersion: "v0.1" },
  "tbct-session-05": { sourceDocument: "TBCT Session 05 Participation Grid", sessionNumber: 5, sourceSection: "Session 05", importedVersion: "v0.1" },
  "tbct-session-06": { sourceDocument: "TBCT Session 06 Color-Coded Symptom Hierarchy", sessionNumber: 6, sourceSection: "Session 06", importedVersion: "v0.1" },
  "tbct-session-07": { sourceDocument: "TBCT Session 07 Consensual Role-Play", sessionNumber: 7, sourceSection: "Session 07", importedVersion: "v0.1" },
  "tbct-session-08": { sourceDocument: "TBCT Session 08 Trial One", sessionNumber: 8, sourceSection: "Session 08", importedVersion: "v0.1" },
};

const sessionDefinitionMeta: Record<string, { title: string; technique: string; clinicalPurpose: string; roleInstruction: string; nodeCount: number; promptCount: number; validationStatus: SessionDefinition["validationStatus"]; status: SessionDefinitionStatus }> = {
  "tbct-session-01": { title: "Introduction to the TBCT Model", technique: "CCD Level 1", clinicalPurpose: "Introduce the TBCT model and orient the participant to the session framework.", roleInstruction: "Introduce the TBCT model and orient the participant to the session framework.", nodeCount: sessionOutlines["tbct-session-01"].length, promptCount: sessionOutlines["tbct-session-01"].length * 2, validationStatus: "review", status: "draft" },
  "tbct-session-02": { title: "Problems and Goals", technique: "CCPH / CCGH", clinicalPurpose: "Elicit problems, priorities, and goals for treatment planning.", roleInstruction: "Elicit problems, priorities, and goals for treatment planning.", nodeCount: sessionOutlines["tbct-session-02"].length, promptCount: sessionOutlines["tbct-session-02"].length * 2, validationStatus: "review", status: "draft" },
  "tbct-session-03": { title: REAL_SESSION_03_TITLE, technique: "Intra-TR", clinicalPurpose: REAL_SESSION_03_SESSION.goals.join(" · "), roleInstruction: REAL_SESSION_03_NODES[0].data.clinicalIntent ?? REAL_SESSION_03_TITLE, nodeCount: REAL_SESSION_03_NODES.length, promptCount: REAL_SESSION_03_NODES.length, validationStatus: "ready", status: "reviewed" },
  "tbct-session-04": { title: "Interpersonal Thought Record", technique: "Inter-TR", clinicalPurpose: "Map interpersonal triggers, thoughts, emotions, behavior, and control points.", roleInstruction: "Map interpersonal triggers, thoughts, emotions, behavior, and control points.", nodeCount: sessionOutlines["tbct-session-04"].length, promptCount: sessionOutlines["tbct-session-04"].length * 2, validationStatus: "review", status: "draft" },
  "tbct-session-05": { title: "Participation Grid", technique: "PG", clinicalPurpose: "Reframe guilt and shame using participation language and ratings.", roleInstruction: "Reframe guilt and shame using participation language and ratings.", nodeCount: sessionOutlines["tbct-session-05"].length, promptCount: sessionOutlines["tbct-session-05"].length * 2, validationStatus: "review", status: "draft" },
  "tbct-session-06": { title: "Color-Coded Symptom Hierarchy", technique: "CCSH", clinicalPurpose: "Build a symptom hierarchy and plan exposure tasks.", roleInstruction: "Build a symptom hierarchy and plan exposure tasks.", nodeCount: sessionOutlines["tbct-session-06"].length, promptCount: sessionOutlines["tbct-session-06"].length * 2, validationStatus: "review", status: "draft" },
  "tbct-session-07": { title: "Consensual Role-Play", technique: "CRP", clinicalPurpose: "Explore ambivalence through chair work and action planning.", roleInstruction: "Explore ambivalence through chair work and action planning.", nodeCount: sessionOutlines["tbct-session-07"].length, promptCount: sessionOutlines["tbct-session-07"].length * 2, validationStatus: "review", status: "draft" },
  "tbct-session-08": { title: "Trial One", technique: "TBTR", clinicalPurpose: "Debrief the first trial and support balanced conclusion work.", roleInstruction: "Debrief the first trial and support balanced conclusion work.", nodeCount: sessionOutlines["tbct-session-08"].length, promptCount: sessionOutlines["tbct-session-08"].length * 2, validationStatus: "review", status: "draft" },
};

const canonicalSession03Id = "tbct-session-03";

function resolveSessionCatalogId(sessionId?: string) {
  if (!sessionId) return sessionId;
  if (sessionId === REAL_SESSION_03_ID || sessionId === "SESSION-03") return canonicalSession03Id;
  return sessionId;
}

function promptTypeForRealNode(node: ProtocolGraphNode): PromptItemType {
  if (node.type === "session_start" || node.type === "orientation" || node.type === "dialogue") return "opening";
  if (node.type === "question") return "question";
  if (node.type === "assessment") return "assessment";
  if (node.type === "condition") return "clarification";
  if (node.type === "activity") return "transition";
  if (node.type === "visualization") return "reflection";
  if (node.type === "homework") return "transition";
  if (node.type === "safety_check") return "opening";
  if (node.type === "clinician_escalation") return "closing";
  if (node.type === "session_complete") return "closing";
  return "question";
}

function promptTextForRealNode(node: ProtocolGraphNode) {
  return node.data.content?.trim() || ((node.data.runtimeAction?.payload as { text?: string } | undefined)?.text?.trim() ?? "") || node.data.title;
}

function promptOutputFieldsForRealNode(node: ProtocolGraphNode) {
  const payload = node.data.runtimeAction?.payload as { field?: string; responseField?: string; label?: string } | undefined;
  if (payload?.field) return [payload.field];
  if (payload?.responseField) return [payload.responseField];
  if (payload?.label) return [payload.label];
  return node.data.completionConditionIds.length ? [...node.data.completionConditionIds] : [node.data.protocolNodeId];
}

function promptValidationForRealNode(node: ProtocolGraphNode) {
  const payload = node.data.runtimeAction?.payload as { kind?: string; min?: number; max?: number } | undefined;
  if (payload?.kind === "rating") return { kind: "rating", min: payload.min ?? 0, max: payload.max ?? 100 };
  if (payload?.kind === "boolean") return { kind: "boolean" };
  if (payload?.kind === "single_choice" || payload?.kind === "multi_choice") return { kind: "text" };
  if (node.type === "assessment") return { kind: "rating", min: 0, max: 100 };
  return { kind: "text" };
}

function buildSession03PromptItem(node: ProtocolGraphNode, order: number): PromptItem {
  const text = promptTextForRealNode(node);
  return withPromptMeta({
    id: `${canonicalSession03Id}-${node.id}-p1`,
    protocolId: REAL_SESSION_03_PROTOCOL_ID,
    sessionId: canonicalSession03Id,
    nodeId: node.id,
    order,
    type: promptTypeForRealNode(node),
    verbatimText: text,
    editableText: text,
    aiInstruction: node.data.clinicalIntent?.trim() || `Use the ${node.data.title} step in ${REAL_SESSION_03_TITLE}.`,
    activationCondition: null,
    outputFields: promptOutputFieldsForRealNode(node),
    validation: promptValidationForRealNode(node),
    completionEffect: node.type === "session_complete" ? null : { type: "advance_node" },
    sourceTrace: sessionSourceTraces[canonicalSession03Id],
    status: "active",
  });
}

function createSessionDefinitions(): SessionDefinition[] {
  return Object.entries(sessionOutlines).map(([sessionId, outline], index) => {
    const number = index + 1;
    const metadata = sessionSourceTraces[sessionId];
    const definitionMeta = sessionDefinitionMeta[sessionId];
    if (sessionId === canonicalSession03Id) {
      return {
        id: sessionId,
        protocolId: REAL_SESSION_03_PROTOCOL_ID,
        number,
        title: definitionMeta.title,
        technique: definitionMeta.technique,
        clinicalPurpose: definitionMeta.clinicalPurpose,
        roleInstruction: definitionMeta.roleInstruction,
        restrictions: [],
        languageRules: ["Preserve verbatim participant-facing wording", "Do not paraphrase original TBCT prompts"],
        status: definitionMeta.status,
        sourceTrace: metadata,
        nodeCount: definitionMeta.nodeCount,
        promptCount: definitionMeta.promptCount,
        validationStatus: definitionMeta.validationStatus,
      };
    }
    return {
      id: sessionId,
      protocolId: REAL_SESSION_03_PROTOCOL_ID,
      number,
      title: definitionMeta.title,
      technique: definitionMeta.technique,
      clinicalPurpose: definitionMeta.clinicalPurpose,
      roleInstruction: definitionMeta.roleInstruction,
      restrictions: [],
      languageRules: ["Preserve verbatim participant-facing wording", "Do not paraphrase original TBCT prompts"],
      status: definitionMeta.status,
      sourceTrace: metadata,
      nodeCount: definitionMeta.nodeCount,
      promptCount: definitionMeta.promptCount,
      validationStatus: definitionMeta.validationStatus,
    };
  });
}

const promptBlueprints: Record<string, Record<string, Array<{ type: PromptItemType; verbatimText: string; aiInstruction: string; outputFields: string[]; validation: object | null; completionEffect: object | null }>>> = {
  "tbct-session-01": {
    "s01-opening": [
      { type: "opening", verbatimText: "How would you describe what is happening right now, quite telegraphically?", aiInstruction: "Distinguish situation from thought.", outputFields: ["currentSituation"], validation: { kind: "text" }, completionEffect: null },
      { type: "clarification", verbatimText: "Is that the situation, or could that be a thought?", aiInstruction: "Help separate situation from interpretation.", outputFields: ["situationVsThought"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s01-situation-thought": [
      { type: "question", verbatimText: "Can you give me an example that is yours, not the three-person example?", aiInstruction: "Collect personal example.", outputFields: ["personalExample"], validation: { kind: "text" }, completionEffect: null },
      { type: "clarification", verbatimText: "What is the situation, and what is the thought about the situation?", aiInstruction: "Separate situation and thought in the example.", outputFields: ["situation", "thought"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s01-three-person": [
      { type: "explanation", verbatimText: "Three different people heard exactly the same compliment. What did you notice about how they thought, felt, and behaved?", aiInstruction: "Run three-person example.", outputFields: ["threePersonObservation"], validation: { kind: "text" }, completionEffect: null },
      { type: "summary", verbatimText: "What does that tell you about the relationship between situations, thoughts, and emotions?", aiInstruction: "Elicit conclusion about cycle.", outputFields: ["cognitiveModelInsight"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s01-cycle": [
      { type: "summary", verbatimText: "When that thought gets stronger, what happens to the emotion?", aiInstruction: "Explore returning arrows.", outputFields: ["thoughtEmotionLink"], validation: { kind: "text" }, completionEffect: null },
      { type: "summary", verbatimText: "When the emotion grows, what happens to the behavior?", aiInstruction: "Explore cycle continuation.", outputFields: ["emotionBehaviorLink"], validation: { kind: "text" }, completionEffect: null },
      { type: "summary", verbatimText: "When the behavior happens, what happens to the situation?", aiInstruction: "Explore feedback loop.", outputFields: ["behaviorSituationLink"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s01-summary": [
      { type: "summary", verbatimText: "Before we move on, what did you notice or understand about how your thoughts, emotions, and behaviors connect?", aiInstruction: "Collect participant summary.", outputFields: ["participantSummary"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s01-distortions": [
      { type: "question", verbatimText: "Do you have the cognitive distortions list in front of you?", aiInstruction: "Confirm list availability.", outputFields: ["distortionListReady"], validation: { kind: "boolean" }, completionEffect: null },
      { type: "question", verbatimText: "Looking at what went through your mind, do any of these distortions seem to fit?", aiInstruction: "Elicit distortion fit.", outputFields: ["relevantDistortions"], validation: { kind: "text" }, completionEffect: null },
      { type: "question", verbatimText: "If this thought might be a distortion, what difference would that make?", aiInstruction: "Explore meaning of noticing distortion.", outputFields: ["distortionMeaning"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s01-closing": [
      { type: "closing", verbatimText: "Would you like to practice noticing automatic thoughts daily using the cognitive distortions list?", aiInstruction: "Invite daily practice.", outputFields: ["dailyPracticeCommitment"], validation: { kind: "text" }, completionEffect: null },
      { type: "closing", verbatimText: "In future sessions, the therapist will introduce the Intra-TR to help break the cycle. Does that make sense?", aiInstruction: "Close with future technique bridge.", outputFields: ["futureTechniqueAwareness"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
  },
  "tbct-session-02": {
    "s02-opening": [
      { type: "opening", verbatimText: "Over the next five or six months, what are the five most important problems that, if resolved, will leave you feeling well?", aiInstruction: "Elicit problems.", outputFields: ["problemList"], validation: { kind: "text" }, completionEffect: null },
      { type: "clarification", verbatimText: "Is there anything going on at home, at work, or in your relationships that's been weighing on you?", aiInstruction: "Prompt for more problems.", outputFields: ["problemListFollowUp"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s02-problems": [
      { type: "question", verbatimText: "Would it help to frame this as something you can influence or change?", aiInstruction: "Support problem framing.", outputFields: ["problemReframe"], validation: { kind: "text" }, completionEffect: null },
      { type: "question", verbatimText: "Got it — I'll add that to your list. What's the next problem?", aiInstruction: "Continue problem list.", outputFields: ["problemList"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s02-hidden": [
      { type: "question", verbatimText: "Would you like to add anything we can call X, Y, or Z for now?", aiInstruction: "Offer private placeholders.", outputFields: ["hiddenProblemPlaceholder"], validation: { kind: "text" }, completionEffect: null },
      { type: "question", verbatimText: "You wouldn't need to explain it — just knowing it's there can still be part of your progress. Would that be okay?", aiInstruction: "Normalize hidden items.", outputFields: ["hiddenProblemConsent"], validation: { kind: "boolean" }, completionEffect: { type: "advance_node" } },
    ],
    "s02-problem-rating": [
      { type: "assessment", verbatimText: "Now I'll ask you to rate each problem using a simple 0 to 5 scale — would you like me to walk you through it?", aiInstruction: "Introduce scale.", outputFields: ["problemScaleReady"], validation: { kind: "boolean" }, completionEffect: null },
      { type: "assessment", verbatimText: "0 is light blue; 5 is red — what score would you give this problem right now?", aiInstruction: "Collect rating.", outputFields: ["problemSeverity"], validation: { kind: "rating", min: 0, max: 5 }, completionEffect: { type: "advance_node" } },
    ],
    "s02-problem-summary": [
      { type: "summary", verbatimText: "Your total problem score today is [SUM]. How does that look to you?", aiInstruction: "Present summary.", outputFields: ["problemTotal"], validation: { kind: "text" }, completionEffect: null },
      { type: "summary", verbatimText: "These are the areas producing the most distress right now. What would you like to focus on first?", aiInstruction: "Transition to priorities.", outputFields: ["problemPriority"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s02-goals": [
      { type: "question", verbatimText: "If therapy goes really well, what are the five most important goals or aspirations you'd like to achieve?", aiInstruction: "Elicit goals.", outputFields: ["goalList"], validation: { kind: "text" }, completionEffect: null },
      { type: "question", verbatimText: "Beyond solving problems, is there something you've been hoping for or moving toward?", aiInstruction: "Prompt for more goals.", outputFields: ["goalListFollowUp"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s02-goal-rating": [
      { type: "assessment", verbatimText: "Now let's rate how difficult or distressing each goal feels to pursue right now using the same 0 to 5 scale.", aiInstruction: "Introduce goal scale.", outputFields: ["goalScaleReady"], validation: { kind: "boolean" }, completionEffect: null },
      { type: "assessment", verbatimText: "What score would you give this goal right now?", aiInstruction: "Collect goal rating.", outputFields: ["goalRating"], validation: { kind: "rating", min: 0, max: 5 }, completionEffect: { type: "advance_node" } },
    ],
    "s02-goal-summary": [
      { type: "closing", verbatimText: "Your goals score today is [SUM]. What matters most to you in this list?", aiInstruction: "Present goals summary.", outputFields: ["goalTotal"], validation: { kind: "text" }, completionEffect: null },
      { type: "closing", verbatimText: "Over time, you'll see these colors shift as you work toward your aspirations.", aiInstruction: "Close goals section.", outputFields: ["goalProgress"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
  },
  "tbct-session-03": {
    "session_start": [
      { type: "opening", verbatimText: "Before we start, how are you doing today? Is there anything urgent or distressing I should know?", aiInstruction: "Safety check.", outputFields: ["safetyCheck"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "intra_tr_introduction": [
      { type: "opening", verbatimText: "Today we are going to work with the Intrapersonal Thought Record, or Intra-TR.", aiInstruction: "Introduce Intra-TR.", outputFields: ["intraTrIntroduction"], validation: { kind: "text" }, completionEffect: null },
      { type: "opening", verbatimText: "It uses the same pieces as the diagram you already know, but takes you further to a new conclusion and a new way of feeling and acting.", aiInstruction: "Connect to CCD.", outputFields: ["intraTrConnection"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "q1_situation": [
      { type: "question", verbatimText: "Can you describe a recent situation that has been causing you distress?", aiInstruction: "Capture distressing situation.", outputFields: ["situation"], validation: { kind: "text" }, completionEffect: null },
      { type: "clarification", verbatimText: "Can you give me a specific moment — a place, a time, something that actually happened?", aiInstruction: "Pin down a specific situation.", outputFields: ["specificSituation"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "q3a_primary_emotion": [
      { type: "question", verbatimText: "When you have that thought, what emotion do you feel?", aiInstruction: "Collect emotion.", outputFields: ["primaryEmotion"], validation: { kind: "text" }, completionEffect: null },
      { type: "assessment", verbatimText: "How strong is that emotion, from 0 to 100 percent?", aiInstruction: "Collect intensity.", outputFields: ["emotionIntensityPercent"], validation: { kind: "rating", min: 0, max: 100 }, completionEffect: { type: "advance_node" } },
    ],
    "q8_evidence_for": [
      { type: "follow_up", verbatimText: "Is there any evidence that supports this automatic thought — things that seem to confirm it is true?", aiInstruction: "Collect evidence for.", outputFields: ["evidenceFor"], validation: { kind: "text" }, completionEffect: null },
      { type: "follow_up", verbatimText: "Try to think of two or three examples if you can.", aiInstruction: "Prompt for more evidence.", outputFields: ["evidenceForMore"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "q10a_balanced_conclusion": [
      { type: "summary", verbatimText: "Taking all of this evidence together, what do you conclude?", aiInstruction: "Collect balanced conclusion.", outputFields: ["balancedConclusion"], validation: { kind: "text" }, completionEffect: null },
      { type: "rating", verbatimText: "How much do you believe that entire conclusion, from 0 to 100 percent?", aiInstruction: "Rate conclusion belief.", outputFields: ["conclusionBeliefPercent"], validation: { kind: "rating", min: 0, max: 100 }, completionEffect: { type: "advance_node" } },
    ],
    "q11_emotion_intensities": [
      { type: "assessment", verbatimText: "Now that you have reached this conclusion, what positive emotions do you feel — if any?", aiInstruction: "Collect positive emotions.", outputFields: ["positiveEmotions"], validation: { kind: "text" }, completionEffect: null },
      { type: "assessment", verbatimText: "What about the original negative emotion — has it changed?", aiInstruction: "Re-rate emotion.", outputFields: ["newEmotionIntensities"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "closing": [
      { type: "closing", verbatimText: "You did important work today. Would you like to review what you wrote and share it with your therapist?", aiInstruction: "Close session.", outputFields: ["closingSummary"], validation: { kind: "text" }, completionEffect: null },
      { type: "closing", verbatimText: "If you'd like, we can also begin working on an action plan based on what you intend to do.", aiInstruction: "Offer action plan bridge.", outputFields: ["actionPlanBridge"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
  },
  "tbct-session-04": {
    "s04-safety": [
      { type: "opening", verbatimText: "What is happening? Can you describe the situation as though it were happening right now?", aiInstruction: "Start Inter-TR with situation.", outputFields: ["situation"], validation: { kind: "text" }, completionEffect: null },
      { type: "question", verbatimText: "What is going through your mind right now?", aiInstruction: "Capture automatic thought.", outputFields: ["automaticThought"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s04-thought-emotion": [
      { type: "question", verbatimText: "How much do you believe that thought, from 0 to 100 percent?", aiInstruction: "Rate belief.", outputFields: ["beliefPercent"], validation: { kind: "rating", min: 0, max: 100 }, completionEffect: null },
      { type: "question", verbatimText: "Believing that, what do you feel?", aiInstruction: "Collect emotion.", outputFields: ["emotion"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s04-body-behavior": [
      { type: "assessment", verbatimText: "What do you do when you believe that and feel that way?", aiInstruction: "Collect behavior.", outputFields: ["behavior"], validation: { kind: "text" }, completionEffect: null },
      { type: "assessment", verbatimText: "Do you notice anything in your body?", aiInstruction: "Collect body response.", outputFields: ["body"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s04-other-perspective": [
      { type: "reflection", verbatimText: "What might be going through the other person's mind when you behave that way?", aiInstruction: "Other perspective AT.", outputFields: ["otherThought"], validation: { kind: "text" }, completionEffect: null },
      { type: "reflection", verbatimText: "What might they feel if they had that thought?", aiInstruction: "Other emotion.", outputFields: ["otherEmotion"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s04-feedback-loop": [
      { type: "summary", verbatimText: "What do you notice about this cycle?", aiInstruction: "Feedback loop discovery.", outputFields: ["feedbackLoopInsight"], validation: { kind: "text" }, completionEffect: null },
      { type: "summary", verbatimText: "How might this cycle keep itself going?", aiInstruction: "Surface self-perpetuation.", outputFields: ["feedbackLoopMechanism"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s04-locus": [
      { type: "assessment", verbatimText: "Which parts of this cycle are outside your control?", aiInstruction: "Locus of control.", outputFields: ["outsideControl"], validation: { kind: "text" }, completionEffect: null },
      { type: "assessment", verbatimText: "What part of this cycle do you have the greatest control over?", aiInstruction: "Identify leverage point.", outputFields: ["controlPoint"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s04-rerating": [
      { type: "assessment", verbatimText: "Now that you can see this cycle, how much do you still believe your original thought?", aiInstruction: "Final AT rating.", outputFields: ["finalBeliefPercent"], validation: { kind: "rating", min: 0, max: 100 }, completionEffect: null },
      { type: "assessment", verbatimText: "How are you feeling overall right now?", aiInstruction: "Final global evaluation.", outputFields: ["finalEvaluation"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s04-action": [
      { type: "transition", verbatimText: "What do you plan to do?", aiInstruction: "Start action plan.", outputFields: ["actionPlanGoal"], validation: { kind: "text" }, completionEffect: null },
      { type: "transition", verbatimText: "Since your own behavior is the part of this cycle you can most influence, what could you do differently next time?", aiInstruction: "Anchor action plan to locus of control.", outputFields: ["actionPlan"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s04-closing": [
      { type: "closing", verbatimText: "Would you like to keep working with this same pattern in the next session?", aiInstruction: "Close Inter-TR.", outputFields: ["closingSummary"], validation: { kind: "text" }, completionEffect: null },
      { type: "closing", verbatimText: "That gives us a concrete place to focus next time.", aiInstruction: "Bridge to next work.", outputFields: ["nextStep"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
  },
  "tbct-session-05": {
    "s05-guilt-shame": [
      { type: "assessment", verbatimText: "On a scale of 0 to 100%, how much do you believe you were guilty of what happened?", aiInstruction: "Baseline guilt belief.", outputFields: ["guiltBelief"], validation: { kind: "rating", min: 0, max: 100 }, completionEffect: null },
      { type: "assessment", verbatimText: "What's the size of this emotion — shame — for you right now?", aiInstruction: "Baseline shame intensity.", outputFields: ["shameIntensity"], validation: { kind: "rating", min: 0, max: 100 }, completionEffect: { type: "advance_node" } },
    ],
    "s05-language": [
      { type: "explanation", verbatimText: "I'm not asking about guilt or blame — I want to understand what connection each factor had with what happened.", aiInstruction: "Language substitution.", outputFields: ["participationLanguage"], validation: { kind: "text" }, completionEffect: null },
      { type: "explanation", verbatimText: "Does that feel workable?", aiInstruction: "Confirm substitution.", outputFields: ["participationLanguageAccepted"], validation: { kind: "boolean" }, completionEffect: { type: "advance_node" } },
    ],
    "s05-contributor": [
      { type: "question", verbatimText: "Who or what else was connected to what happened?", aiInstruction: "Collect contributors.", outputFields: ["contributors"], validation: { kind: "text" }, completionEffect: null },
      { type: "question", verbatimText: "Would it help to frame this as 'how I'm coping with it' so we can track your own journey?", aiInstruction: "Support framing.", outputFields: ["contributorReframe"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s05-ratings": [
      { type: "assessment", verbatimText: "How much did each contributor participate in the event?", aiInstruction: "Collect participation percentages.", outputFields: ["participationRatings"], validation: { kind: "text" }, completionEffect: null },
      { type: "assessment", verbatimText: "You'll rate yourself last. What percentage remains for you?", aiInstruction: "Prompt self-last rating.", outputFields: ["selfPercentage"], validation: { kind: "rating", min: 0, max: 100 }, completionEffect: { type: "advance_node" } },
    ],
    "s05-socratic": [
      { type: "question", verbatimText: "Before we move to the next evaluation, could you help me understand a little more about each of these elements?", aiInstruction: "Deepen understanding.", outputFields: ["socraticDeepening"], validation: { kind: "text" }, completionEffect: null },
      { type: "question", verbatimText: "What was your age, developmental stage, or level of authority at that time?", aiInstruction: "Explore context.", outputFields: ["contextFactors"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s05-rerating": [
      { type: "assessment", verbatimText: "How much do you now believe you were guilty of the event?", aiInstruction: "Re-rate guilt belief.", outputFields: ["finalGuiltBelief"], validation: { kind: "rating", min: 0, max: 100 }, completionEffect: null },
      { type: "assessment", verbatimText: "What's the size of shame for you now?", aiInstruction: "Re-rate shame.", outputFields: ["finalShameIntensity"], validation: { kind: "rating", min: 0, max: 100 }, completionEffect: { type: "advance_node" } },
    ],
    "s05-final-emotion": [
      { type: "summary", verbatimText: "What values come up for you now?", aiInstruction: "Values closing.", outputFields: ["values"], validation: { kind: "text" }, completionEffect: null },
      { type: "summary", verbatimText: "What would it mean to live those values going forward?", aiInstruction: "Close with values.", outputFields: ["valuesForward"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s05-values": [
      { type: "reflection", verbatimText: "What values come up for you now?", aiInstruction: "Values reflection.", outputFields: ["values"], validation: { kind: "text" }, completionEffect: null },
      { type: "closing", verbatimText: "Those values can guide what happens next.", aiInstruction: "Values close.", outputFields: ["valuesClose"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
  },
  "tbct-session-06": {
    "s06-id": [
      { type: "question", verbatimText: "What symptom or avoidance pattern is central?", aiInstruction: "Identify central symptom.", outputFields: ["symptoms"], validation: { kind: "text" }, completionEffect: null },
      { type: "question", verbatimText: "What do you do to feel safe?", aiInstruction: "Capture safety behavior.", outputFields: ["safetyBehaviors"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s06-color-scale": [
      { type: "assessment", verbatimText: "0 is comfortable, 5 is so much distress that I cannot imagine facing it — what would you rate this?", aiInstruction: "Introduce color scale.", outputFields: ["scaleReady"], validation: { kind: "boolean" }, completionEffect: null },
      { type: "assessment", verbatimText: "How much discomfort or distress does this item produce right now?", aiInstruction: "Score item.", outputFields: ["itemRating"], validation: { kind: "rating", min: 0, max: 5 }, completionEffect: { type: "advance_node" } },
    ],
    "s06-green-homework": [
      { type: "transition", verbatimText: "Which small version of this item could you challenge this week?", aiInstruction: "Choose green homework.", outputFields: ["greenHomework"], validation: { kind: "text" }, completionEffect: null },
      { type: "transition", verbatimText: "What would help make sure you actually do it?", aiInstruction: "Accountability and timing.", outputFields: ["homeworkAccountability"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s06-exposure": [
      { type: "explanation", verbatimText: "Green items are discomfort and should always be challenged.", aiInstruction: "Explain exposure principles.", outputFields: ["greenPrinciple"], validation: { kind: "text" }, completionEffect: null },
      { type: "explanation", verbatimText: "Yellow items are faced with the therapist's help, and red items are never challenged directly.", aiInstruction: "Explain yellow/red handling.", outputFields: ["yellowRedPrinciple"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s06-safety-behavior": [
      { type: "summary", verbatimText: "What is the underlying assumption that explains why you do this?", aiInstruction: "Formulate underlying assumption.", outputFields: ["underlyingAssumption"], validation: { kind: "text" }, completionEffect: null },
      { type: "summary", verbatimText: "Where would you put that sentence on the diagram?", aiInstruction: "Map UA to diagram.", outputFields: ["diagramPlacement"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s06-assumption": [
      { type: "question", verbatimText: "If I take the elevator alone, what do I fear will happen?", aiInstruction: "Convert to conditional assumption.", outputFields: ["conditionalAssumption"], validation: { kind: "text" }, completionEffect: null },
      { type: "question", verbatimText: "Can we understand this as an underlying assumption?", aiInstruction: "Confirm UA.", outputFields: ["assumptionConfirmed"], validation: { kind: "boolean" }, completionEffect: { type: "advance_node" } },
    ],
  },
  "tbct-session-07": {
    "s07-consent": [
      { type: "opening", verbatimText: "I'd like to propose that today we work through a decision that feels important but difficult using Consensual Role-Play.", aiInstruction: "Open CRP.", outputFields: ["crpConsent"], validation: { kind: "boolean" }, completionEffect: null },
      { type: "opening", verbatimText: "Would you like to try it?", aiInstruction: "Check readiness.", outputFields: ["crpReadiness"], validation: { kind: "boolean" }, completionEffect: { type: "advance_node" } },
    ],
    "s07-pros-cons": [
      { type: "question", verbatimText: "What are the disadvantages of carrying out the action?", aiInstruction: "Collect disadvantages.", outputFields: ["disadvantages"], validation: { kind: "text" }, completionEffect: null },
      { type: "question", verbatimText: "What are the advantages of carrying out the action?", aiInstruction: "Collect advantages.", outputFields: ["advantages"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s07-weights": [
      { type: "assessment", verbatimText: "Emotion: what percentage do the disadvantages have?", aiInstruction: "Emotion weights.", outputFields: ["emotionWeights"], validation: { kind: "text" }, completionEffect: null },
      { type: "assessment", verbatimText: "Reason: what percentage do the advantages have?", aiInstruction: "Reason weights.", outputFields: ["reasonWeights"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s07-chair-setup": [
      { type: "instruction", verbatimText: "Step into your emotional role now.", aiInstruction: "Set up Emotion chair.", outputFields: ["emotionChair"], validation: { kind: "text" }, completionEffect: null },
      { type: "instruction", verbatimText: "Now move across and step into your reasoning role.", aiInstruction: "Set up Reason chair.", outputFields: ["reasonChair"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s07-emotion-chair": [
      { type: "reflection", verbatimText: "Emotion, speak directly to Reason — what is the downside here?", aiInstruction: "Emotion speaks.", outputFields: ["emotionSpeaks"], validation: { kind: "text" }, completionEffect: null },
      { type: "reflection", verbatimText: "What else?", aiInstruction: "Keep Emotion talking.", outputFields: ["emotionMore"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s07-reason-chair": [
      { type: "reflection", verbatimText: "Reason, what do you want to say back to Emotion?", aiInstruction: "Reason speaks.", outputFields: ["reasonSpeaks"], validation: { kind: "text" }, completionEffect: null },
      { type: "reflection", verbatimText: "What does Reason think the person could do?", aiInstruction: "Reason response.", outputFields: ["reasonMore"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s07-consensus": [
      { type: "summary", verbatimText: "What did you notice about the dialogue between Reason and Emotion?", aiInstruction: "Consensus summary.", outputFields: ["consensusInsight"], validation: { kind: "text" }, completionEffect: null },
      { type: "summary", verbatimText: "What surprised you?", aiInstruction: "Surface learning.", outputFields: ["consensusLearning"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s07-readiness": [
      { type: "assessment", verbatimText: "Are you ready to implement this action?", aiInstruction: "Readiness decision.", outputFields: ["readiness"], validation: { kind: "boolean" }, completionEffect: null },
      { type: "assessment", verbatimText: "Would you like to be ready later?", aiInstruction: "Conditional readiness.", outputFields: ["conditionalReadiness"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s07-action": [
      { type: "transition", verbatimText: "What actions will you take?", aiInstruction: "Action plan actions.", outputFields: ["actionPlanActions"], validation: { kind: "text" }, completionEffect: null },
      { type: "transition", verbatimText: "Who can support accountability, and what is the fallback if the first attempt doesn't come off?", aiInstruction: "Action plan supports.", outputFields: ["actionPlanSupport"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
  },
  "tbct-session-08": {
    "s08-trigger": [
      { type: "question", verbatimText: "What trigger brought up the core belief?", aiInstruction: "Identify trigger and core belief.", outputFields: ["trigger"], validation: { kind: "text" }, completionEffect: null },
      { type: "question", verbatimText: "What does that mean to you about yourself?", aiInstruction: "Downward arrow to core belief.", outputFields: ["coreBelief"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s08-courtroom": [
      { type: "instruction", verbatimText: "Imagine the person who will accuse you. What does this person look like?", aiInstruction: "Prepare prosecutor imagery.", outputFields: ["prosecutorImagery"], validation: { kind: "text" }, completionEffect: null },
      { type: "instruction", verbatimText: "Now step into the prosecutor's chair and present the evidence supporting the charge.", aiInstruction: "Begin prosecutor role.", outputFields: ["prosecutorEvidence"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s08-defendant": [
      { type: "reflection", verbatimText: "As the defendant, how much do you believe the charge now?", aiInstruction: "Defendant re-rate.", outputFields: ["defendantBelief"], validation: { kind: "rating", min: 0, max: 100 }, completionEffect: null },
      { type: "reflection", verbatimText: "What emotion do you feel when you hear that?", aiInstruction: "Defendant emotion.", outputFields: ["defendantEmotion"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s08-prosecutor": [
      { type: "question", verbatimText: "What evidence supports the charge?", aiInstruction: "Collect prosecution evidence.", outputFields: ["prosecutorCase"], validation: { kind: "text" }, completionEffect: null },
      { type: "question", verbatimText: "BUT... what else?", aiInstruction: "Continue prosecutor evidence.", outputFields: ["prosecutorCaseMore"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s08-defense": [
      { type: "question", verbatimText: "What evidence shows the defendant does not deserve such an accusation?", aiInstruction: "Collect defense evidence.", outputFields: ["defenseCase"], validation: { kind: "text" }, completionEffect: null },
      { type: "question", verbatimText: "What concrete example can you offer?", aiInstruction: "Get concrete evidence.", outputFields: ["defenseCaseMore"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s08-rebuttal": [
      { type: "follow_up", verbatimText: "The defense said this evidence — BUT…", aiInstruction: "Prosecutor rebuttal.", outputFields: ["rebuttal"], validation: { kind: "text" }, completionEffect: null },
      { type: "follow_up", verbatimText: "Therefore…", aiInstruction: "Defense meaning.", outputFields: ["surrebuttal"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s08-jury": [
      { type: "summary", verbatimText: "What do you think of that piece of evidence?", aiInstruction: "Jury review evidence.", outputFields: ["juryReview"], validation: { kind: "text" }, completionEffect: null },
      { type: "summary", verbatimText: "What is the role of a juror?", aiInstruction: "Establish jury role.", outputFields: ["juryRole"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s08-verdict": [
      { type: "summary", verbatimText: "Are you ready to say guilty or not guilty?", aiInstruction: "Collect verdict readiness.", outputFields: ["verdictReady"], validation: { kind: "boolean" }, completionEffect: null },
      { type: "summary", verbatimText: "What is your verdict?", aiInstruction: "Collect verdict.", outputFields: ["verdict"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s08-ratings": [
      { type: "assessment", verbatimText: "How much do you believe the charge now, from 0 to 100%?", aiInstruction: "Final belief re-rating.", outputFields: ["finalBelief"], validation: { kind: "rating", min: 0, max: 100 }, completionEffect: null },
      { type: "assessment", verbatimText: "How are you feeling overall right now?", aiInstruction: "Final emotional intensity.", outputFields: ["finalEmotion"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
    "s08-debrief": [
      { type: "summary", verbatimText: "What does the defense and jury's decision say about you?", aiInstruction: "Debrief the trial.", outputFields: ["debrief"], validation: { kind: "text" }, completionEffect: null },
      { type: "summary", verbatimText: "What positive belief does that point to?", aiInstruction: "Bridge to positive belief.", outputFields: ["positiveBelief"], validation: { kind: "text" }, completionEffect: { type: "advance_node" } },
    ],
  },
};

function promptText(sessionId: string, nodeId: string, promptIndex: number) {
  return promptBlueprints[sessionId]?.[nodeId]?.[promptIndex]?.verbatimText ?? `Prompt ${promptIndex + 1} for ${nodeId}.`;
}

function withPromptMeta(prompt: Omit<PromptItem, "createdAt" | "updatedAt" | "updatedBy"> & Partial<Pick<PromptItem, "createdAt" | "updatedAt" | "updatedBy">>): PromptItem {
  const timestamp = now();
  return { ...prompt, origin: prompt.origin ?? "imported", createdAt: prompt.createdAt ?? timestamp, updatedAt: prompt.updatedAt ?? timestamp, updatedBy: prompt.updatedBy ?? "Demo User" };
}

function createSessionSeeds(): SessionSeed[] {
  return createSessionDefinitions().map((definition) => {
    const trace = definition.sourceTrace;
    if (definition.id === canonicalSession03Id) {
      return {
        definition,
        nodes: REAL_SESSION_03_NODES.map((node) => ({
          id: node.id,
          protocolId: REAL_SESSION_03_PROTOCOL_ID,
          sessionId: definition.id,
          title: node.data.title,
          type: node.type,
          clinicalPurpose: node.data.clinicalIntent ?? node.data.content ?? node.data.title,
          position: node.position,
          requiredFields: promptOutputFieldsForRealNode(node),
          completionRule: { type: "all_prompts_completed" },
          branchRules: [],
          restrictions: [],
          safetyRuleIds: node.data.safetyRuleIds ?? [],
          sourceTrace: sessionSourceTraces[canonicalSession03Id],
          status: node.data.status,
        })),
        promptItems: buildSession03PromptItems(),
      };
    }
    const outline = sessionOutlines[definition.id];
    const nodes: ClinicalStageNode[] = outline.map((node, index) => ({
      id: node.id,
      protocolId: REAL_SESSION_03_PROTOCOL_ID,
      sessionId: definition.id,
      title: node.title,
      type: node.type,
      clinicalPurpose: node.clinicalPurpose,
      position: { x: 180 + (index % 2) * 260, y: 120 + index * 180 },
      requiredFields: node.requiredFields,
      completionRule: { type: "all_prompts_completed" },
      branchRules: [],
      restrictions: [],
      safetyRuleIds: node.type === "safety_check" ? ["GLOBAL-RISK-01"] : [],
      sourceTrace: trace,
      status: "draft",
    }));
    const promptItems: PromptItem[] = outline.flatMap((node) => {
      const blueprints = promptBlueprints[definition.id]?.[node.id];
      if (blueprints?.length) {
        return blueprints.map((blueprint, promptIndex) => withPromptMeta({
          id: `${definition.id}-${node.id}-p${promptIndex + 1}`,
          protocolId: REAL_SESSION_03_PROTOCOL_ID,
          sessionId: definition.id,
          nodeId: node.id,
          order: promptIndex + 1,
          type: blueprint.type,
          verbatimText: blueprint.verbatimText,
          editableText: blueprint.verbatimText,
          aiInstruction: blueprint.aiInstruction,
          activationCondition: null,
          outputFields: blueprint.outputFields,
          validation: blueprint.validation,
          completionEffect: blueprint.completionEffect,
          sourceTrace: trace,
          status: "active",
        }));
      }
      return [withPromptMeta({
        id: `${definition.id}-${node.id}-p1`,
        protocolId: REAL_SESSION_03_PROTOCOL_ID,
        sessionId: definition.id,
        nodeId: node.id,
        order: 1,
        type: "question",
        verbatimText: promptText(definition.id, node.id, 0),
        editableText: promptText(definition.id, node.id, 0),
        aiInstruction: `Use the ${node.title} step in ${definition.title}.`,
        activationCondition: null,
        outputFields: node.requiredFields,
        validation: node.type === "assessment" ? { kind: "rating", min: 0, max: 100 } : null,
        completionEffect: { type: "advance_node" },
        sourceTrace: trace,
        status: "active",
      })];
    });
    return { definition, nodes, promptItems };
  });
}

function buildSession03PromptItems(): PromptItem[] {
  return REAL_SESSION_03_NODES.map((node, index) => buildSession03PromptItem(node, index + 1));
}

function createDefaultStore() {
  const seeds = createSessionSeeds();
  const definitions = seeds.map((seed) => seed.definition);
  const nodes = seeds.flatMap((seed) => seed.nodes);
  const promptItems = seeds.flatMap((seed) => seed.promptItems);
  const plan: SessionPlan = { id: "tbct-default-plan-v2", protocolId: REAL_SESSION_03_PROTOCOL_ID, orderedEntries: definitions.map((definition, index) => ({ entryId: `${definition.id}-entry`, sessionId: definition.id, order: index + 1, active: true, occurrence: 1, label: `Session ${String(definition.number).padStart(2, "0")}` })), startingEntryId: "tbct-session-01-entry", status: "draft", version: "1.0.0", createdAt: now(), updatedAt: now() };
  return { plan, definitions, nodes, promptItems, commonRules: defaultSessionCommonRules };
}

let cachedStore: ReturnType<typeof createDefaultStore> | null = null;
function getStore() { if (!cachedStore) cachedStore = readStore(); return cachedStore; }
function readStore(): { plan: SessionPlan; definitions: SessionDefinition[]; nodes: ClinicalStageNode[]; promptItems: PromptItem[]; commonRules: Record<string, SessionCommonRules> } {
  const defaultStore = createDefaultStore();
  if (typeof window !== "undefined") {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<ReturnType<typeof createDefaultStore>>;
        if (parsed?.plan && parsed?.definitions && parsed?.nodes && parsed?.promptItems) {
          const parsedNodes = parsed.nodes.filter((node) => resolveSessionCatalogId(node.sessionId) !== canonicalSession03Id);
          const parsedPromptItems = parsed.promptItems.filter((promptItem) => resolveSessionCatalogId(promptItem.sessionId) !== canonicalSession03Id);

          const mergedCommonRules = { ...defaultStore.commonRules };
          for (const [sessionId, rules] of Object.entries(parsed.commonRules ?? {})) {
            const normalizedSessionId = resolveSessionCatalogId(sessionId);
            if (!normalizedSessionId) continue;
            const defaultRules = mergedCommonRules[normalizedSessionId] ?? defaultSessionCommonRules[normalizedSessionId];
            if (!defaultRules) continue;
            mergedCommonRules[normalizedSessionId] = {
              ...defaultRules,
              ...rules,
              sessionTitle: rules.sessionTitle?.trim() ? rules.sessionTitle : defaultRules.sessionTitle,
              techniqueName: rules.techniqueName?.trim() ? rules.techniqueName : defaultRules.techniqueName,
              roleAndStance: rules.roleAndStance?.trim() ? rules.roleAndStance : defaultRules.roleAndStance,
              sessionObjective: rules.sessionObjective?.trim() ? rules.sessionObjective : defaultRules.sessionObjective,
              clinicalContext: rules.clinicalContext?.trim() ? rules.clinicalContext : defaultRules.clinicalContext,
              previousSessionContext: rules.previousSessionContext?.trim() ? rules.previousSessionContext : defaultRules.previousSessionContext,
              languageAndTerminologyRules: rules.languageAndTerminologyRules?.trim() ? rules.languageAndTerminologyRules : defaultRules.languageAndTerminologyRules,
              toneAndInteractionRules: rules.toneAndInteractionRules?.trim() ? rules.toneAndInteractionRules : defaultRules.toneAndInteractionRules,
              sessionWideRequiredActions: rules.sessionWideRequiredActions?.length ? rules.sessionWideRequiredActions : defaultRules.sessionWideRequiredActions,
              sessionWideRestrictions: rules.sessionWideRestrictions?.length ? rules.sessionWideRestrictions : defaultRules.sessionWideRestrictions,
              safetyAndEscalationRules: rules.safetyAndEscalationRules?.trim() ? rules.safetyAndEscalationRules : defaultRules.safetyAndEscalationRules,
              defaultModalityRules: rules.defaultModalityRules?.length ? rules.defaultModalityRules : defaultRules.defaultModalityRules,
              version: rules.version?.trim() ? rules.version : defaultRules.version,
              status: rules.status ?? defaultRules.status,
            };
          }

          return {
            plan: parsed.plan ?? defaultStore.plan,
            definitions: defaultStore.definitions,
            nodes: [...defaultStore.nodes.filter((node) => node.sessionId === canonicalSession03Id), ...parsedNodes],
            promptItems: [...defaultStore.promptItems.filter((promptItem) => promptItem.sessionId === canonicalSession03Id), ...parsedPromptItems].map((promptItem) => ({
              ...promptItem,
              editableText: promptItem.editableText ?? promptItem.verbatimText,
              createdAt: promptItem.createdAt ?? now(),
              updatedAt: promptItem.updatedAt ?? now(),
              updatedBy: promptItem.updatedBy ?? "Demo User",
            })),
            commonRules: mergedCommonRules,
          };
        }
      } catch {
        /* fall through */
      }
    }
  }
  return defaultStore;
}
function writeStore(store: ReturnType<typeof createDefaultStore>) { if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }
function persistStore(store: ReturnType<typeof createDefaultStore>) { cachedStore = store; writeStore(store); }

export const SOURCE_FIDELITY_CATALOG_BACKUP_ID = "pre-full-source-fidelity-rebuild";

const SOURCE_FIDELITY_SCHEMA_VERSION = "source-fidelity-catalog/v1";
const SOURCE_FIDELITY_BACKUP_STORAGE_KEY = `tbct.source-fidelity-backup.${SOURCE_FIDELITY_CATALOG_BACKUP_ID}`;

export type SourceFidelityCatalogConflict = {
  legacyItemId: string;
  reason: "unmapped_legacy_item" | "source_changed";
  editableText?: string;
  status?: string;
  sourceTrace?: unknown;
};

type SourceFidelityCatalogStore = {
  schemaVersion: typeof SOURCE_FIDELITY_SCHEMA_VERSION;
  sourceVersion: string;
  sourceTextHash: string;
  plan: SessionPlan;
  definitions: SessionDefinition[];
  nodes: ClinicalStageNode[];
  promptItems: PromptItem[];
  commonRules: Record<string, SessionCommonRules>;
  migrationConflicts: SourceFidelityCatalogConflict[];
};

export type SessionCatalogEntry = Pick<SessionDefinition, "id" | "number" | "title" | "technique" | "clinicalPurpose" | "nodeCount" | "promptCount" | "validationStatus" | "sourceTrace"> & {
  active: boolean;
};

function cloneSourceValue<T>(value: T): T {
  return structuredClone(value);
}

function toCatalogSourceTrace(sourceTrace: CanonicalSourceTrace): SourceTrace {
  return {
    sourceDocument: sourceTrace.sourceDocument,
    sourceSession: sourceTrace.sourceSession,
    sourceSection: sourceTrace.sourceSection,
    sourceLineStart: sourceTrace.sourceLineStart,
    sourceLineEnd: sourceTrace.sourceLineEnd,
    sourceTextHash: sourceTrace.sourceTextHash,
    sourceSessionHash: sourceTrace.sourceSessionHash,
    importedVersion: sourceTrace.importedVersion,
    rawSourceExcerpt: sourceTrace.rawSourceExcerpt,
    reviewWarnings: sourceTrace.reviewWarnings ? [...sourceTrace.reviewWarnings] : undefined,
  };
}

function createSourceFidelityStore(): SourceFidelityCatalogStore {
  const definitions = CANONICAL_SESSION_DEFINITIONS.map((definition) => ({
    id: definition.id,
    protocolId: definition.protocolId,
    number: definition.number,
    title: definition.title,
    technique: definition.technique,
    clinicalPurpose: definition.clinicalPurpose,
    roleInstruction: definition.roleInstruction,
    restrictions: [...definition.sessionWideRestrictions],
    languageRules: [...definition.languageRules],
    status: definition.status,
    sourceTrace: toCatalogSourceTrace(definition.sourceTrace),
    sourceFidelityStatus: definition.sourceFidelityStatus,
    nodeCount: definition.nodeCount,
    promptCount: definition.promptCount,
    validationStatus: definition.validationStatus,
  } satisfies SessionDefinition));
  const nodes = CANONICAL_STAGE_NODES.map((node) => ({
    ...cloneSourceValue(node),
    promptItemIds: [...node.promptItemIds],
    sourceTrace: toCatalogSourceTrace(node.sourceTrace),
  } satisfies ClinicalStageNode));
  const promptItems = CANONICAL_PROMPT_ITEMS.map((promptItem) => ({
    ...cloneSourceValue(promptItem),
    sourceTrace: toCatalogSourceTrace(promptItem.sourceTrace),
  } satisfies PromptItem));
  const commonRules = Object.fromEntries(
    Object.entries(CANONICAL_SESSION_COMMON_RULES).map(([sessionId, rules]) => [
      sessionId,
      {
        ...cloneSourceValue(rules),
        sourceTrace: toCatalogSourceTrace(rules.sourceTrace),
      } satisfies SessionCommonRules,
    ]),
  ) as Record<string, SessionCommonRules>;

  return {
    schemaVersion: SOURCE_FIDELITY_SCHEMA_VERSION,
    sourceVersion: CANONICAL_SOURCE_VERSION,
    sourceTextHash: TBCT_SOURCE_TEXT_HASH,
    plan: cloneSourceValue(CANONICAL_SESSION_PLAN),
    definitions,
    nodes,
    promptItems,
    commonRules,
    migrationConflicts: [],
  };
}

function getBrowserStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function legacyBackupFrom(value: unknown): SourceFidelityBackup {
  const record = asRecord(value) ?? {};
  const sourceTraces = [
    ...asArray(record.definitions),
    ...asArray(record.nodes),
    ...asArray(record.promptItems),
  ].flatMap((item) => {
    const sourceTrace = asRecord(item)?.sourceTrace;
    return sourceTrace ? [sourceTrace] : [];
  });

  return {
    id: SOURCE_FIDELITY_CATALOG_BACKUP_ID,
    createdAt: now(),
    migrationVersion: CANONICAL_SOURCE_VERSION,
    sessionDefinitions: asArray(record.definitions),
    nodes: asArray(record.nodes),
    edges: asArray(record.edges),
    promptItems: asArray(record.promptItems),
    sessionPlan: record.plan ?? null,
    releases: asArray(record.releases),
    runtimeReferences: asArray(record.runtimeReferences),
    sourceTraces,
  };
}

function preserveLegacyCatalogBackup(value: unknown) {
  const storage = getBrowserStorage();
  if (!storage || storage.getItem(SOURCE_FIDELITY_BACKUP_STORAGE_KEY)) return;
  storage.setItem(SOURCE_FIDELITY_BACKUP_STORAGE_KEY, JSON.stringify(legacyBackupFrom(value)));
}

function sourceAnchorMatches(value: unknown, sourcePrompt: PromptItem) {
  const candidate = asRecord(value);
  const sourceTrace = asRecord(candidate?.sourceTrace);
  return candidate?.id === sourcePrompt.id
    && candidate.sourceHash === sourcePrompt.sourceHash
    && sourceTrace?.sourceTextHash === sourcePrompt.sourceTrace.sourceTextHash
    && sourceTrace?.sourceLineStart === sourcePrompt.sourceTrace.sourceLineStart
    && sourceTrace?.sourceLineEnd === sourcePrompt.sourceTrace.sourceLineEnd;
}

function collectMigrationConflicts(value: unknown, baseline: SourceFidelityCatalogStore) {
  const record = asRecord(value) ?? {};
  const sourcePrompts = new Map(baseline.promptItems.map((promptItem) => [promptItem.id, promptItem]));
  return asArray(record.promptItems).flatMap((legacyPrompt): SourceFidelityCatalogConflict[] => {
    const prompt = asRecord(legacyPrompt);
    const id = typeof prompt?.id === "string" ? prompt.id : "unknown-legacy-prompt";
    const current = sourcePrompts.get(id);
    if (current && sourceAnchorMatches(prompt, current)) return [];
    return [{
      legacyItemId: id,
      reason: current ? "source_changed" : "unmapped_legacy_item",
      editableText: typeof prompt?.editableText === "string" ? prompt.editableText : undefined,
      status: typeof prompt?.status === "string" ? prompt.status : undefined,
      sourceTrace: prompt?.sourceTrace,
    }];
  });
}

function mergePersistedSourceStore(value: unknown, baseline: SourceFidelityCatalogStore) {
  const record = asRecord(value) ?? {};
  const persistedPrompts = asArray(record.promptItems);
  const persistedNodes = asArray(record.nodes);
  const persistedCommonRules = asRecord(record.commonRules) ?? {};
  const migrationConflicts = collectMigrationConflicts(value, baseline);
  const nodes = baseline.nodes.map((sourceNode) => {
    const stored = asRecord(persistedNodes.find((item) => asRecord(item)?.id === sourceNode.id));
    return {
      ...sourceNode,
      objective: typeof stored?.objective === "string" ? stored.objective : sourceNode.objective,
      speakerRoleId: typeof stored?.speakerRoleId === "string" ? stored.speakerRoleId : sourceNode.speakerRoleId,
      entryCondition: stored?.entryCondition && typeof stored.entryCondition === "object" ? stored.entryCondition as ConditionExpression : sourceNode.entryCondition,
      completionCondition: stored?.completionCondition && typeof stored.completionCondition === "object" ? stored.completionCondition as ConditionExpression : sourceNode.completionCondition,
      maxNodeIterations: typeof stored?.maxNodeIterations === "number" ? stored.maxNodeIterations : sourceNode.maxNodeIterations,
    } satisfies ClinicalStageNode;
  });
  const promptItems = baseline.promptItems.map((sourcePrompt) => {
    const storedPrompt = persistedPrompts.find((item) => asRecord(item)?.id === sourcePrompt.id);
    if (!storedPrompt) return sourcePrompt;
    const stored = asRecord(storedPrompt);
    if (!sourceAnchorMatches(stored, sourcePrompt)) {
      return {
        ...sourcePrompt,
        sourceUpdateAvailable: true,
        migrationHistory: [{ migrationVersion: CANONICAL_SOURCE_VERSION, previousId: sourcePrompt.id, mapping: "source_changed", at: now() }],
      } satisfies PromptItem;
    }
    const status = stored?.status === "disabled" ? "disabled" : "active";
    return {
      ...sourcePrompt,
      editableText: typeof stored?.editableText === "string" ? stored.editableText : sourcePrompt.editableText,
      aiInstruction: typeof stored?.aiInstruction === "string" ? stored.aiInstruction : sourcePrompt.aiInstruction,
      modelGuidance: typeof stored?.modelGuidance === "string" ? stored.modelGuidance : sourcePrompt.modelGuidance,
      fallbackPatientText: typeof stored?.fallbackPatientText === "string" ? stored.fallbackPatientText : sourcePrompt.fallbackPatientText,
      sequenceIndex: typeof stored?.sequenceIndex === "number" ? stored.sequenceIndex : sourcePrompt.sequenceIndex,
      roleId: typeof stored?.roleId === "string" ? stored.roleId : sourcePrompt.roleId,
      scope: typeof stored?.scope === "string" ? stored.scope as PromptScope : sourcePrompt.scope,
      executionMode: typeof stored?.executionMode === "string" ? stored.executionMode as PromptExecutionMode : sourcePrompt.executionMode,
      completionCondition: stored?.completionCondition && typeof stored.completionCondition === "object" ? stored.completionCondition as ConditionExpression : sourcePrompt.completionCondition,
      requiredFields: Array.isArray(stored?.requiredFields) ? stored.requiredFields.filter((value): value is string => typeof value === "string") : sourcePrompt.requiredFields,
      validationRules: Array.isArray(stored?.validationRules) ? stored.validationRules.filter((value): value is ValidationRule => Boolean(value && typeof value === "object" && typeof asRecord(value)?.id === "string")) : sourcePrompt.validationRules,
      allowedActions: Array.isArray(stored?.allowedActions) ? stored.allowedActions.filter((value): value is string => typeof value === "string") : sourcePrompt.allowedActions,
      forbiddenActions: Array.isArray(stored?.forbiddenActions) ? stored.forbiddenActions.filter((value): value is string => typeof value === "string") : sourcePrompt.forbiddenActions,
      maxAttempts: typeof stored?.maxAttempts === "number" ? stored.maxAttempts : sourcePrompt.maxAttempts,
      maxIterations: typeof stored?.maxIterations === "number" ? stored.maxIterations : sourcePrompt.maxIterations,
      outputSchemaVersion: typeof stored?.outputSchemaVersion === "string" ? stored.outputSchemaVersion : sourcePrompt.outputSchemaVersion,
      status,
      updatedAt: typeof stored?.updatedAt === "string" ? stored.updatedAt : sourcePrompt.updatedAt,
      updatedBy: typeof stored?.updatedBy === "string" ? stored.updatedBy : sourcePrompt.updatedBy,
      migrationHistory: [{ migrationVersion: CANONICAL_SOURCE_VERSION, previousId: sourcePrompt.id, mapping: "exact", at: now() }],
    } satisfies PromptItem;
  });

  const commonRules = Object.fromEntries(Object.entries(baseline.commonRules).map(([sessionId, sourceRules]) => {
    const stored = asRecord(persistedCommonRules[sessionId]);
    const textFields = ["sessionTitle", "techniqueName", "roleAndStance", "sessionObjective", "clinicalContext", "previousSessionContext", "languageAndTerminologyRules", "toneAndInteractionRules", "safetyAndEscalationRules", "version"] as const;
    const arrayFields = ["sessionWideRequiredActions", "sessionWideRestrictions", "defaultModalityRules", "languageRules", "openingRules", "sessionWideSafetyRules"] as const;
    const merged = { ...sourceRules } as SessionCommonRules;
    for (const field of textFields) {
      if (typeof stored?.[field] === "string") merged[field] = stored[field] as never;
    }
    for (const field of arrayFields) {
      if (Array.isArray(stored?.[field])) merged[field] = stored[field]!.filter((item): item is string => typeof item === "string") as never;
    }
    if (stored?.status === "incomplete" || stored?.status === "clinical_review" || stored?.status === "safety_review" || stored?.status === "validated" || stored?.status === "published") {
      merged.status = stored.status;
    }
    return [sessionId, merged];
  }));

  return { ...baseline, nodes, promptItems, commonRules, migrationConflicts };
}

function readSourceFidelityStore(): SourceFidelityCatalogStore {
  const baseline = createSourceFidelityStore();
  const storage = getBrowserStorage();
  if (!storage) return baseline;
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return baseline;

  try {
    const parsed = JSON.parse(raw) as unknown;
    const record = asRecord(parsed);
    if (record?.schemaVersion !== SOURCE_FIDELITY_SCHEMA_VERSION) {
      preserveLegacyCatalogBackup(parsed);
      const migrated = { ...baseline, migrationConflicts: collectMigrationConflicts(parsed, baseline) };
      storage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
    const merged = mergePersistedSourceStore(parsed, baseline);
    storage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return baseline;
  }
}

export const sessionCatalog: SessionCatalogEntry[] = [];

function synchronizeSessionCatalog(store: SourceFidelityCatalogStore) {
  const activeSessionIds = new Set(store.plan.orderedEntries.filter((entry) => entry.active).map((entry) => entry.sessionId));
  sessionCatalog.splice(
    0,
    sessionCatalog.length,
    ...store.definitions.map((definition) => ({
      id: definition.id,
      number: definition.number,
      title: definition.title,
      technique: definition.technique,
      clinicalPurpose: definition.clinicalPurpose,
      nodeCount: definition.nodeCount,
      promptCount: definition.promptCount,
      validationStatus: definition.validationStatus,
      active: activeSessionIds.has(definition.id),
      sourceTrace: definition.sourceTrace,
    })),
  );
}

let sourceFidelityStore = readSourceFidelityStore();
synchronizeSessionCatalog(sourceFidelityStore);

function getSourceFidelityStore() {
  return sourceFidelityStore;
}

function persistSourceFidelityStore(store: SourceFidelityCatalogStore) {
  sourceFidelityStore = store;
  synchronizeSessionCatalog(store);
  const storage = getBrowserStorage();
  if (storage) storage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function canonicalCatalogSessionId(sessionId?: string) {
  return resolveCanonicalSessionId(sessionId) ?? sessionId;
}

function updateSourcePrompt(sourcePrompt: PromptItem, patch: Partial<PromptItem>): PromptItem {
  return {
    ...sourcePrompt,
    editableText: typeof patch.editableText === "string" ? patch.editableText : sourcePrompt.editableText,
    aiInstruction: typeof patch.aiInstruction === "string" ? patch.aiInstruction : sourcePrompt.aiInstruction,
    modelGuidance: typeof patch.modelGuidance === "string" ? patch.modelGuidance : sourcePrompt.modelGuidance,
    fallbackPatientText: typeof patch.fallbackPatientText === "string" ? patch.fallbackPatientText : sourcePrompt.fallbackPatientText,
    sequenceIndex: typeof patch.sequenceIndex === "number" ? patch.sequenceIndex : sourcePrompt.sequenceIndex,
    roleId: typeof patch.roleId === "string" ? patch.roleId : sourcePrompt.roleId,
    scope: patch.scope ?? sourcePrompt.scope,
    executionMode: patch.executionMode ?? sourcePrompt.executionMode,
    completionCondition: patch.completionCondition ?? sourcePrompt.completionCondition,
    requiredFields: patch.requiredFields ? [...patch.requiredFields] : sourcePrompt.requiredFields,
    validationRules: patch.validationRules ? patch.validationRules.map((rule) => ({ ...rule })) : sourcePrompt.validationRules,
    allowedActions: patch.allowedActions ? [...patch.allowedActions] : sourcePrompt.allowedActions,
    forbiddenActions: patch.forbiddenActions ? [...patch.forbiddenActions] : sourcePrompt.forbiddenActions,
    maxAttempts: typeof patch.maxAttempts === "number" ? patch.maxAttempts : sourcePrompt.maxAttempts,
    maxIterations: typeof patch.maxIterations === "number" ? patch.maxIterations : sourcePrompt.maxIterations,
    outputSchemaVersion: typeof patch.outputSchemaVersion === "string" ? patch.outputSchemaVersion : sourcePrompt.outputSchemaVersion,
    status: patch.status === "disabled" ? "disabled" : patch.status === "active" ? "active" : sourcePrompt.status,
    updatedAt: now(),
    updatedBy: "Demo User",
  };
}

export function loadSessionPlan() { return getSourceFidelityStore().plan; }
export function saveSessionPlan(_plan: SessionPlan) { return loadSessionPlan(); }
export function restoreDefaultSessionPlan() {
  const next = createSourceFidelityStore();
  persistSourceFidelityStore(next);
  return next.plan;
}
export function loadSessionDefinitions() { return getSourceFidelityStore().definitions; }
export function loadStageNodes(sessionId?: string) {
  const canonicalSessionId = canonicalCatalogSessionId(sessionId);
  return canonicalSessionId ? getSourceFidelityStore().nodes.filter((node) => node.sessionId === canonicalSessionId) : getSourceFidelityStore().nodes;
}
export function loadPromptItems(sessionId?: string, nodeId?: string) {
  const canonicalSessionId = canonicalCatalogSessionId(sessionId);
  return getSourceFidelityStore().promptItems.filter((promptItem) => (!canonicalSessionId || promptItem.sessionId === canonicalSessionId) && (!nodeId || promptItem.nodeId === nodeId));
}
export function getSessionCommonRules(sessionId: string) {
  const canonicalSessionId = canonicalCatalogSessionId(sessionId);
  return canonicalSessionId ? getSourceFidelityStore().commonRules[canonicalSessionId] ?? null : null;
}
export function saveSessionCommonRules(sessionId: string, commonRules: SessionCommonRules) {
  const canonicalSessionId = canonicalCatalogSessionId(sessionId);
  if (!canonicalSessionId) return null;
  const store = getSourceFidelityStore();
  const next = { ...store, commonRules: { ...store.commonRules, [canonicalSessionId]: { ...commonRules } } };
  persistSourceFidelityStore(next);
  return next.commonRules[canonicalSessionId];
}
export function savePromptItems(updated: PromptItem[]) {
  const updates = new Map(updated.map((promptItem) => [promptItem.id, promptItem]));
  const store = getSourceFidelityStore();
  const promptItems = store.promptItems.map((promptItem) => {
    const patch = updates.get(promptItem.id);
    return patch ? updateSourcePrompt(promptItem, patch) : promptItem;
  });
  persistSourceFidelityStore({ ...store, promptItems });
}
export function updatePromptItem(promptItemId: string, patch: Partial<Omit<PromptItem, "id" | "protocolId" | "sessionId" | "nodeId" | "verbatimText" | "sourceTrace" | "sourceHash" | "origin">>) {
  const store = getSourceFidelityStore();
  const promptItems = store.promptItems.map((promptItem) => promptItem.id === promptItemId ? updateSourcePrompt(promptItem, patch) : promptItem);
  persistSourceFidelityStore({ ...store, promptItems });
  return promptItems.find((promptItem) => promptItem.id === promptItemId) ?? null;
}
export function updateSessionNodeRuntime(nodeId: string, patch: Partial<Pick<ClinicalStageNode, "objective" | "speakerRoleId" | "entryCondition" | "completionCondition" | "maxNodeIterations">>) {
  const store = getSourceFidelityStore();
  const nodes = store.nodes.map((node) => node.id === nodeId ? { ...node, ...patch } : node);
  persistSourceFidelityStore({ ...store, nodes });
  return nodes.find((node) => node.id === nodeId) ?? null;
}

export function getSessionBuilderDraftSnapshot(): SourceFidelityReleaseSnapshot {
  const draft = getSourceFidelityStore();
  return {
    canonicalProtocolId: CANONICAL_PROTOCOL_ID,
    sourceVersion: draft.sourceVersion,
    sourceTextHash: draft.sourceTextHash,
    sessionPlan: structuredClone(CANONICAL_SESSION_PLAN),
    sessionDefinitions: structuredClone(CANONICAL_SESSION_DEFINITIONS),
    sessionCommonRules: Object.fromEntries(Object.entries(CANONICAL_SESSION_COMMON_RULES).map(([sessionId, sourceRules]) => {
      const localRules = draft.commonRules[sessionId];
      return [sessionId, {
        ...structuredClone(sourceRules),
        roleAndStance: localRules?.roleAndStance ?? sourceRules.roleAndStance,
        sessionObjective: localRules?.sessionObjective ?? sourceRules.sessionObjective,
        languageRules: localRules?.languageRules ?? sourceRules.languageRules,
        openingRules: localRules?.openingRules ?? sourceRules.openingRules,
        sessionWideRequiredActions: localRules?.sessionWideRequiredActions ?? sourceRules.sessionWideRequiredActions,
        sessionWideRestrictions: localRules?.sessionWideRestrictions ?? sourceRules.sessionWideRestrictions,
        sessionWideSafetyRules: localRules?.sessionWideSafetyRules ?? sourceRules.sessionWideSafetyRules,
      }];
    })),
    clinicalStageNodes: CANONICAL_STAGE_NODES.map((sourceNode) => {
      const localNode = draft.nodes.find((node) => node.id === sourceNode.id);
      return {
        ...structuredClone(sourceNode),
        objective: localNode?.objective ?? sourceNode.objective,
        speakerRoleId: localNode?.speakerRoleId ?? sourceNode.speakerRoleId,
        entryCondition: localNode?.entryCondition ?? sourceNode.entryCondition,
        completionCondition: localNode?.completionCondition ?? sourceNode.completionCondition,
        maxNodeIterations: localNode?.maxNodeIterations ?? sourceNode.maxNodeIterations,
      };
    }),
    promptItems: CANONICAL_PROMPT_ITEMS.map((sourcePrompt) => {
      const localPrompt = draft.promptItems.find((promptItem) => promptItem.id === sourcePrompt.id);
      return {
        ...structuredClone(sourcePrompt),
        editableText: localPrompt?.editableText ?? sourcePrompt.editableText,
        aiInstruction: localPrompt?.aiInstruction ?? sourcePrompt.aiInstruction,
        modelGuidance: localPrompt?.modelGuidance ?? sourcePrompt.modelGuidance,
        fallbackPatientText: localPrompt?.fallbackPatientText ?? sourcePrompt.fallbackPatientText,
        sequenceIndex: localPrompt?.sequenceIndex ?? sourcePrompt.sequenceIndex,
        roleId: localPrompt?.roleId ?? sourcePrompt.roleId,
        scope: localPrompt?.scope ?? sourcePrompt.scope,
        executionMode: localPrompt?.executionMode ?? sourcePrompt.executionMode,
        completionCondition: localPrompt?.completionCondition ?? sourcePrompt.completionCondition,
        requiredFields: localPrompt?.requiredFields ?? sourcePrompt.requiredFields,
        validationRules: localPrompt?.validationRules ?? sourcePrompt.validationRules,
        allowedActions: localPrompt?.allowedActions ?? sourcePrompt.allowedActions,
        forbiddenActions: localPrompt?.forbiddenActions ?? sourcePrompt.forbiddenActions,
        maxAttempts: localPrompt?.maxAttempts ?? sourcePrompt.maxAttempts,
        maxIterations: localPrompt?.maxIterations ?? sourcePrompt.maxIterations,
        outputSchemaVersion: localPrompt?.outputSchemaVersion ?? sourcePrompt.outputSchemaVersion,
        status: localPrompt?.status ?? sourcePrompt.status,
      };
    }),
    sourceFidelityEdges: structuredClone(CANONICAL_SOURCE_EDGES),
  };
}
export function restorePromptItemFromVerbatim(promptItemId: string) {
  return updatePromptItem(promptItemId, { editableText: getSourceFidelityStore().promptItems.find((promptItem) => promptItem.id === promptItemId)?.verbatimText });
}
export function duplicatePromptItem(_promptItemId: string) { return null; }
export function movePromptItem(promptItemId: string, _direction: -1 | 1) { return getSourceFidelityStore().promptItems.find((promptItem) => promptItem.id === promptItemId) ?? null; }
export function togglePromptItemStatus(promptItemId: string) {
  const promptItem = getSourceFidelityStore().promptItems.find((item) => item.id === promptItemId);
  return promptItem ? updatePromptItem(promptItemId, { status: promptItem.status === "active" ? "disabled" : "active" }) : null;
}
export function getSessionById(sessionId: string) {
  const canonicalSessionId = canonicalCatalogSessionId(sessionId);
  return loadSessionDefinitions().find((definition) => definition.id === canonicalSessionId) ?? null;
}
export function getActiveSessionId() { return loadSessionPlan().orderedEntries.find((entry) => entry.active)?.sessionId ?? "tbct-s01"; }
export function getSessionTotals() {
  return loadSessionDefinitions().reduce(
    (totals, definition) => ({
      nodes: totals.nodes + loadStageNodes(definition.id).length,
      prompts: totals.prompts + loadPromptItems(definition.id).length,
      enabled: totals.enabled + Number(loadSessionPlan().orderedEntries.some((entry) => entry.sessionId === definition.id && entry.active)),
    }),
    { nodes: 0, prompts: 0, enabled: 0 },
  );
}
export function duplicateSessionEntry(_sessionId: string) { return loadSessionPlan(); }
export function reorderSessionEntry(_sessionId: string, _direction: -1 | 1) { return loadSessionPlan(); }
export function toggleSessionEntryActive(_sessionId: string) { return loadSessionPlan(); }
export function setStartingSession(_sessionId: string) { return loadSessionPlan(); }
export function getSessionNodeCount(sessionId: string) { return loadStageNodes(sessionId).length; }
export function getSessionPromptCount(sessionId: string) { return loadPromptItems(sessionId).length; }
export function getPromptValidationWarnings(promptItem: PromptItem) {
  const warnings: string[] = [];
  if (!promptItem.verbatimText.trim()) warnings.push("missing_verbatim_text");
  if (promptItem.origin !== "source_imported") warnings.push("non_source_prompt");
  if (!promptItem.sourceHash || promptItem.sourceHash !== TBCT_SOURCE_TEXT_HASH) warnings.push("source_hash_mismatch");
  if (!promptItem.sourceTrace.sourceLineStart || !promptItem.sourceTrace.sourceLineEnd) warnings.push("source_trace_missing");
  if (promptItem.sourceFidelityStatus === "review_required") warnings.push("source_review_required");
  return warnings;
}
export function getSessionNodes(sessionId: string) { return loadStageNodes(sessionId); }
export function getSessionPrompts(sessionId: string, nodeId?: string) {
  const nodeOrder = new Map(getSessionNodes(sessionId).map((node, index) => [node.id, index]));
  return loadPromptItems(sessionId, nodeId).sort((left, right) => {
    const leftNodeOrder = nodeOrder.get(left.nodeId) ?? Number.MAX_SAFE_INTEGER;
    const rightNodeOrder = nodeOrder.get(right.nodeId) ?? Number.MAX_SAFE_INTEGER;
    return leftNodeOrder - rightNodeOrder || left.order - right.order;
  });
}
export function getSourceFidelityCatalogBackup() {
  const raw = getBrowserStorage()?.getItem(SOURCE_FIDELITY_BACKUP_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SourceFidelityBackup;
  } catch {
    return null;
  }
}
export function getSourceFidelityCatalogMigrationConflicts() { return [...getSourceFidelityStore().migrationConflicts]; }
