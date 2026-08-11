import { sourceText } from "@/lib/protocol/source-fidelity-catalog";
import type { SessionSourceMetadata, SessionSpec } from "@/lib/protocol/source-fidelity-catalog";

const metadata: SessionSourceMetadata = {
  number: 8,
  id: "tbct-s08",
  title: "Trial One",
  techniqueName: "Trial One",
  acronym: "TBTR",
  sourceLineStart: 1537,
  sourceLineEnd: 1651,
  sourceSessionHash: "b53082bbf7fac347ef2b04002a661a82af815f1307c531236d4b6f610305634e",
  contextRange: [1537, 1548],
  roleRange: [1537, 1548],
  languageRange: [1549, 1574],
  openingRange: [1549, 1574],
  requiredActionsRange: [1578, 1632],
  restrictionsRange: [1634, 1651],
  safetyRange: [1634, 1651],
};

export const spec: SessionSpec = {
  metadata,
  nodes: [
    {
      slug: "investigation-and-core-belief",
      title: "Step 1 - Investigation and Core Belief",
      type: "session_start",
      source: [1578, 1578],
      requiredFields: ["distressingSituation", "automaticThought", "coreBelief"],
      safetyRuleIds: ["TBCT-S08-CRISIS-STOP"],
      restrictions: [sourceText([1549, 1574])],
      prompts: [
        {
          slug: "distressing-situation",
          type: "question",
          source: [1578, 1578],
          patientText: "Please identify a distressing situation and the automatic thought it triggered. What actually happened, and what thought went through your mind?",
          outputFields: ["distressingSituation", "automaticThought"],
        },
        { slug: "downward-arrow", type: "question", source: [1578, 1578], marker: "If that thought were true", outputFields: ["coreBelief"], validation: { kind: "participant_generated_core_belief" } },
      ],
    },
    {
      slug: "baseline-ratings",
      title: "Step 2 - Baseline Belief and Emotion Ratings",
      type: "assessment",
      source: [1579, 1579],
      requiredFields: ["coreBeliefBaselinePercent", "baselineEmotion", "baselineEmotionIntensityPercent"],
      prompts: [
        { slug: "core-belief-rating", type: "rating", source: [1579, 1579], patientText: "From 0 to 100%, how much do you believe this core belief right now?", outputFields: ["coreBeliefBaselinePercent"], validation: { kind: "rating", min: 0, max: 100, stateScaleEveryTime: true } },
        { slug: "baseline-emotion", type: "question", source: [1579, 1579], patientText: "What emotion do you feel when you believe this charge?", outputFields: ["baselineEmotion"] },
        { slug: "baseline-emotion-rating", type: "rating", source: [1579, 1579], patientText: "From 0 to 100%, how intense is that emotion right now?", outputFields: ["baselineEmotionIntensityPercent"], validation: { kind: "rating", min: 0, max: 100, stateScaleEveryTime: true } },
      ],
    },
    {
      slug: "courtroom-orientation",
      title: "Step 3 - Courtroom Orientation",
      type: "orientation",
      source: [1580, 1580],
      requiredFields: ["courtroomOrientationAcknowledged", "charge"],
      restrictions: [sourceText([1549, 1574])],
      prompts: [
        // No `marker` here on purpose: Step 3's source line only offers
        // "The charge is: I am a failure." as an illustrative example of
        // the pattern, not literal script text, but marker-extraction
        // can't tell the difference -- it would otherwise become this
        // prompt's verbatim/fallback text and get spoken to every
        // participant regardless of what core belief they actually gave
        // in Step 1. runtime-static-message.ts's contextualPatientText
        // builds the real, participant-specific charge from the
        // coreBelief field instead; the completionEffect below persists
        // that same value into the charge field once delivered.
        { slug: "state-charge", type: "explanation", source: [1580, 1580], outputFields: ["charge"], completionEffect: { type: "copy_field", from: "coreBelief", to: "charge" } },
        { slug: "roles-orientation", type: "instruction", source: [1580, 1580], patientText: "We will examine this charge in a symbolic internal courtroom. You will move through the roles of defendant, prosecutor, defense attorney, and juror while I guide the process.", outputFields: ["courtroomOrientationAcknowledged"], validation: { kind: "courtroom_roles_understood" } },
      ],
    },
    {
      slug: "defendant-chair",
      title: "Step 4 - Defendant Chair",
      type: "dialogue",
      source: [1582, 1582],
      requiredFields: ["defendantRoleReady", "defendantPreProsecutionBeliefPercent", "defendantPreProsecutionEmotionIntensityPercent"],
      restrictions: [sourceText([1549, 1574])],
      prompts: [
        { slug: "enter-defendant-role", type: "role_transition", source: [1582, 1582], patientText: "Please move into the defendant's role and take a moment to settle there before we continue.", outputFields: ["defendantRoleReady"], validation: { kind: "slow_explicit_role_transition", requiresReadyConfirmation: true } },
        { slug: "defendant-pre-prosecution-ratings", type: "rating", source: [1582, 1582], patientText: "As the defendant, rate both values from 0 to 100%: how much you believe the charge, and how intense the emotion feels.", outputFields: ["defendantPreProsecutionBeliefPercent", "defendantPreProsecutionEmotionIntensityPercent"], validation: { kind: "paired_ratings", min: 0, max: 100, stateScaleEveryTime: true } },
      ],
    },
    {
      slug: "prosecutor-imagery",
      title: "Step 5 - Prosecutor Imagery",
      type: "visualization",
      source: [1583, 1584],
      requiredFields: ["prosecutorImagery"],
      restrictions: [sourceText([1549, 1574]), sourceText([1583, 1584])],
      prompts: [
        { slug: "visualize-prosecutor", type: "question", source: [1583, 1584], marker: "Imagine the person who will accuse", outputFields: ["prosecutorImagery"], validation: { kind: "role_imagery", fields: ["sex", "age", "appearance", "manner", "expression"], disallowCloseFamilyOrFriend: true } },
      ],
    },
    {
      slug: "prosecution-evidence",
      title: "Step 6 - Prosecution Evidence",
      type: "dialogue",
      source: [1585, 1589],
      requiredFields: ["prosecutionEvidence"],
      restrictions: [sourceText([1549, 1574]), sourceText([1585, 1589])],
      prompts: [
        // requiresThirdPerson does NOT belong on these readiness-confirmation
        // prompts -- it's a rule about how the participant describes the
        // defendant's actions while arguing a courtroom role (see
        // violatesThirdPersonRequirement in runtime-context.ts), not about how
        // they confirm being settled in the role. Applying it here rejected
        // every natural "I'm ready"/"I am ready now" answer as a first-person
        // violation and deadlocked the session (matches enter-defendant-role
        // and post-verdict-defendant below, which never had it).
        { slug: "enter-prosecutor-role", type: "role_transition", source: [1585, 1589], outputFields: ["prosecutorRoleReady"], validation: { kind: "slow_explicit_role_transition", requiresReadyConfirmation: true } },
        {
          slug: "prosecution-evidence",
          type: "question",
          source: [1585, 1589],
          outputFields: ["prosecutionEvidence"],
          validation: { kind: "array", minItems: 2, maxItems: 4, oneAtATime: true, participantSuppliesEvidence: true, acrossLife: true },
          // Re-asks for one piece of evidence at a time until at least two
          // are collected (or the participant signals there are no more),
          // instead of accepting a single item and moving on.
          executionMode: "repeat_until",
          maxIterations: 4,
          completionCondition: { kind: "field", field: "prosecutionEvidenceSufficient", operator: "equals", value: true },
        },
      ],
    },
    {
      slug: "defendant-return-defense-imagery",
      title: "Step 7 - Defendant Return and Defense Imagery",
      type: "visualization",
      source: [1591, 1592],
      requiredFields: ["defendantPostProsecutionBeliefPercent", "defendantPostProsecutionEmotionIntensityPercent", "defenseImagery"],
      restrictions: [sourceText([1549, 1574]), sourceText([1591, 1592])],
      prompts: [
        { slug: "return-to-defendant", type: "role_transition", source: [1591, 1592], outputFields: ["defendantPostProsecutionBeliefPercent", "defendantPostProsecutionEmotionIntensityPercent"], validation: { kind: "paired_ratings_after_readback", min: 0, max: 100, stateScaleEveryTime: true } },
        { slug: "visualize-defense", type: "question", source: [1591, 1592], outputFields: ["defenseImagery"], validation: { kind: "role_imagery", fields: ["sex", "age", "appearance", "manner", "expression"], disallowCloseFamilyOrFriend: true } },
      ],
    },
    {
      slug: "defense-evidence",
      title: "Step 8 - Defense Evidence",
      type: "dialogue",
      source: [1593, 1598],
      requiredFields: ["defenseEvidence"],
      restrictions: [sourceText([1549, 1574]), sourceText([1593, 1598])],
      prompts: [
        { slug: "enter-defense-role", type: "role_transition", source: [1593, 1598], outputFields: ["defenseRoleReady"], validation: { kind: "slow_explicit_role_transition", requiresReadyConfirmation: true } },
        {
          slug: "defense-evidence",
          type: "question",
          source: [1593, 1598],
          outputFields: ["defenseEvidence"],
          validation: { kind: "array", minItems: 2, maxItems: 4, oneAtATime: true, concreteExamplesRequired: true },
          executionMode: "repeat_until",
          maxIterations: 4,
          completionCondition: { kind: "field", field: "defenseEvidenceSufficient", operator: "equals", value: true },
        },
        { slug: "concrete-defense-evidence", type: "clarification", source: [1593, 1598], marker: "concrete example", activationCondition: { field: "defenseEvidenceIsVague", operator: "equals", value: true }, outputFields: ["defenseEvidence"] },
      ],
    },
    {
      slug: "defendant-post-defense",
      title: "Step 9 - Defendant Post-Defense Re-assessment",
      type: "assessment",
      source: [1600, 1600],
      requiredFields: ["defendantPostDefenseBeliefPercent", "defendantPostDefenseEmotionIntensityPercent"],
      restrictions: [sourceText([1549, 1574])],
      prompts: [
        { slug: "return-to-defendant", type: "role_transition", source: [1600, 1600], outputFields: ["defendantPostDefenseBeliefPercent", "defendantPostDefenseEmotionIntensityPercent"], validation: { kind: "paired_ratings", min: 0, max: 100, stateScaleEveryTime: true } },
      ],
    },
    {
      slug: "prosecution-rebuttal",
      title: "Step 10 - Prosecution Rebuttal",
      type: "dialogue",
      source: [1601, 1601],
      requiredFields: ["prosecutionRebuttals"],
      restrictions: [sourceText([1549, 1574]), sourceText([1601, 1601])],
      prompts: [
        { slug: "return-to-prosecutor", type: "role_transition", source: [1601, 1601], outputFields: ["prosecutorRoleReady"], validation: { kind: "slow_explicit_role_transition", requiresReadyConfirmation: true } },
        { slug: "rebut-each-defense-item", type: "question", source: [1601, 1601], marker: "The defense said", outputFields: ["prosecutionRebuttals"], validation: { kind: "one_rebuttal_per_defense_item", requiresButPhrase: true, assistantMustNotCoach: true } },
      ],
    },
    {
      slug: "defendant-post-rebuttal",
      title: "Step 11 - Defendant Post-Rebuttal Re-assessment",
      type: "assessment",
      source: [1602, 1602],
      requiredFields: ["defendantPostRebuttalBeliefPercent", "defendantPostRebuttalEmotionIntensityPercent", "unrebuttedDefenseEvidence"],
      prompts: [
        { slug: "return-to-defendant", type: "role_transition", source: [1602, 1602], outputFields: ["defendantPostRebuttalBeliefPercent", "defendantPostRebuttalEmotionIntensityPercent"], validation: { kind: "paired_ratings", min: 0, max: 100, stateScaleEveryTime: true } },
        { slug: "unrebutted-defense-note", type: "reflection", source: [1602, 1602], marker: "unable to find a rebuttal", outputFields: ["unrebuttedDefenseEvidence"] },
      ],
    },
    {
      slug: "defense-surrebuttal",
      title: "Step 12 - Defense Surrebuttal",
      type: "dialogue",
      source: [1604, 1604],
      requiredFields: ["defenseSurrebuttals", "thereforeConclusions"],
      restrictions: [sourceText([1549, 1574]), sourceText([1604, 1604])],
      prompts: [
        { slug: "return-to-defense", type: "role_transition", source: [1604, 1604], outputFields: ["defenseRoleReady"], validation: { kind: "slow_explicit_role_transition", requiresReadyConfirmation: true } },
        { slug: "surrebut-each-pair", type: "question", source: [1604, 1604], marker: "The prosecution said", outputFields: ["defenseSurrebuttals"], validation: { kind: "one_surrebuttal_per_rebuttal" } },
        { slug: "participant-therefore", type: "follow_up", source: [1604, 1604], marker: "Therefore", outputFields: ["thereforeConclusions"], validation: { kind: "participant_generated", perEvidencePair: true, assistantMustNotSupply: true } },
      ],
    },
    {
      slug: "defendant-post-surrebuttal",
      title: "Step 13 - Defendant Post-Surrebuttal Re-assessment",
      type: "assessment",
      source: [1605, 1606],
      requiredFields: ["defendantPostSurrebuttalBeliefPercent", "defendantPostSurrebuttalEmotionIntensityPercent"],
      prompts: [
        { slug: "return-to-defendant", type: "role_transition", source: [1605, 1606], outputFields: ["defendantPostSurrebuttalBeliefPercent", "defendantPostSurrebuttalEmotionIntensityPercent"], validation: { kind: "paired_ratings", min: 0, max: 100, stateScaleEveryTime: true } },
      ],
    },
    {
      slug: "jury-deliberation",
      title: "Step 14 - Jury Deliberation and Verdict",
      type: "dialogue",
      source: [1609, 1616],
      requiredFields: ["juryOrientation", "juryReview", "verdict"],
      restrictions: [sourceText([1549, 1574]), sourceText([1609, 1616])],
      prompts: [
        { slug: "enter-jury-role", type: "role_transition", source: [1609, 1616], outputFields: ["juryOrientation"], validation: { kind: "slow_explicit_role_transition", requiresReadyConfirmation: true, privateJuryRoom: true } },
        { slug: "juror-role", type: "question", source: [1609, 1616], marker: "What is the role of a juror", outputFields: ["juryOrientation"] },
        // "question" + repeat_until: the jury must actually review each of
        // the four evidence blocks in turn (minItems:4) instead of
        // completing on one generic reflection.
        {
          slug: "review-four-blocks",
          type: "question",
          source: [1609, 1616],
          outputFields: ["juryReview"],
          validation: { kind: "array", minItems: 4, maxItems: 4, blocks: ["prosecution", "defense", "prosecution_rebuttal", "defense_surrebuttal"], oneItemAtATime: true },
          executionMode: "repeat_until",
          maxIterations: 4,
          completionCondition: { kind: "field", field: "juryReviewCount", operator: "greater_than", value: 3 },
        },
        { slug: "participant-verdict", type: "question", source: [1609, 1616], marker: "verdict: guilty or not guilty", outputFields: ["verdict"], validation: { kind: "enum", values: ["guilty", "not_guilty"], participantGenerated: true, assistantMustNotSupply: true, challengeGuiltyThroughEvidenceReview: true } },
        {
          slug: "guilty-verdict-recheck",
          type: "clarification",
          source: [1609, 1616],
          patientText: "Before that verdict is announced, look back once more at the defense evidence and the defense's responses to the prosecution. Considering all four blocks again, do you still find the defendant guilty, or does this second look change the verdict?",
          activationCondition: { field: "verdict", operator: "equals", value: "guilty" },
          outputFields: ["verdict"],
          validation: { kind: "enum", values: ["guilty", "not_guilty"], participantGenerated: true, assistantMustNotSupply: true },
        },
      ],
    },
    {
      slug: "court-officer-announcement",
      title: "Step 15 - Court Officer Announcement",
      type: "dialogue",
      source: [1617, 1617],
      requiredFields: ["verdictAnnounced"],
      restrictions: [sourceText([1617, 1617])],
      prompts: [
        { slug: "announce-verdict", type: "role_transition", source: [1617, 1617], marker: "formally announce the verdict", outputFields: ["verdictAnnounced"], validation: { kind: "participant_announces_verdict", physicalPositionChange: true } },
      ],
    },
    {
      slug: "defendant-post-verdict",
      title: "Step 16 - Defendant Post-Verdict Ratings",
      type: "assessment",
      source: [1618, 1618],
      requiredFields: ["defendantPostVerdictBeliefPercent", "defendantPostVerdictEmotionIntensityPercent"],
      prompts: [
        { slug: "post-verdict-defendant", type: "role_transition", source: [1618, 1618], outputFields: ["defendantPostVerdictReady"], validation: { kind: "slow_explicit_role_transition", requiresReadyConfirmation: true } },
        { slug: "post-verdict-ratings", type: "rating", source: [1618, 1618], marker: "now that they have heard the verdict", outputFields: ["defendantPostVerdictBeliefPercent", "defendantPostVerdictEmotionIntensityPercent"], validation: { kind: "paired_ratings_before_discussion", min: 0, max: 100, stateScaleEveryTime: true } },
      ],
    },
    {
      slug: "open-discussion",
      title: "Step 17 - Open Discussion",
      type: "dialogue",
      source: [1620, 1627],
      requiredFields: ["trialDiscussion"],
      prompts: [
        { slug: "trial-experience", type: "question", source: [1620, 1627], marker: "What was it like", outputFields: ["trialDiscussion"] },
        { slug: "prosecution-satisfaction", type: "question", source: [1620, 1627], marker: "Was the prosecution satisfied", outputFields: ["trialDiscussion"] },
        { slug: "defense-demonstration", type: "question", source: [1620, 1627], marker: "What did the defense want", outputFields: ["trialDiscussion"] },
        { slug: "preferred-ally", type: "question", source: [1620, 1627], marker: "Who would you prefer", outputFields: ["trialDiscussion"] },
        { slug: "good-defense", type: "question", source: [1620, 1627], marker: "What does a good defense attorney", outputFields: ["trialDiscussion"] },
        { slug: "what-defines-person", type: "question", source: [1620, 1627], marker: "What defines a person", outputFields: ["trialDiscussion"] },
        { slug: "upward-arrow", type: "question", source: [1620, 1627], marker: "If the defense and the jury are correct", outputFields: ["trialDiscussion"] },
      ],
    },
    {
      slug: "positive-belief",
      title: "Step 18 - Positive Belief",
      type: "question",
      source: [1628, 1628],
      requiredFields: ["positiveBelief"],
      restrictions: [sourceText([1628, 1628])],
      prompts: [
        { slug: "participant-positive-belief", type: "question", source: [1628, 1628], marker: "positive belief must come from the participant", outputFields: ["positiveBelief"], validation: { kind: "participant_generated", participantGenerated: true, assistantMustNotSupply: true, writeToAppealRecord: true } },
      ],
    },
    {
      slug: "appeal-preparation",
      title: "Step 19 - Appeal Preparation",
      type: "homework",
      source: [1630, 1630],
      requiredFields: ["appealEvidence", "appealHomeworkAcknowledged"],
      prompts: [
        {
          slug: "appeal-evidence",
          // "question", not "worksheet_instruction": this prompt requires
          // the participant to actually supply evidence turn after turn,
          // and the passive "worksheet_instruction" type would otherwise
          // be treated as complete on assistant delivery alone.
          type: "question",
          source: [1630, 1630],
          marker: "identify at least two",
          outputFields: ["appealEvidence"],
          validation: { kind: "array", minItems: 2, maxItems: 3, supportsField: "positiveBelief" },
          executionMode: "repeat_until",
          maxIterations: 3,
          completionCondition: { kind: "field", field: "appealEvidenceSufficient", operator: "equals", value: true },
        },
        { slug: "daily-appeal-homework", type: "instruction", source: [1630, 1630], marker: "daily task", outputFields: ["appealHomeworkAcknowledged"] },
      ],
    },
    {
      slug: "positive-belief-rating",
      title: "Step 20 - Positive Belief Rating",
      type: "assessment",
      source: [1631, 1631],
      requiredFields: ["positiveBeliefPercent"],
      prompts: [
        { slug: "positive-belief-rating", type: "rating", source: [1631, 1631], marker: "how much they believe", outputFields: ["positiveBeliefPercent"], validation: { kind: "rating", min: 0, max: 100, stateScaleEveryTime: true } },
      ],
    },
    {
      slug: "original-charge-final-ratings",
      title: "Step 21 - Original Charge Final Ratings",
      type: "session_complete",
      source: [1632, 1632],
      requiredFields: ["originalChargeFinalBeliefPercent", "originalChargeFinalEmotionIntensityPercent"],
      restrictions: [sourceText([1634, 1651])],
      terminal: true,
      prompts: [
        { slug: "original-charge-final-ratings", type: "rating", source: [1632, 1632], marker: "re-assess their final level of belief", outputFields: ["originalChargeFinalBeliefPercent", "originalChargeFinalEmotionIntensityPercent"], validation: { kind: "paired_ratings", min: 0, max: 100, stateScaleEveryTime: true }, completionEffect: { type: "complete_session" } },
      ],
    },
    {
      slug: "safety-pause",
      title: "Safety Pause and Support",
      type: "clinician_escalation",
      source: [1634, 1651],
      safetyRuleIds: ["TBCT-S08-CRISIS-STOP"],
      terminal: true,
      prompts: [
        { slug: "stop-trial", type: "instruction", source: [1634, 1651], outputFields: ["safetyEscalation"], completionEffect: { type: "pause_session" }, safetyRuleIds: ["TBCT-S08-CRISIS-STOP"] },
      ],
    },
  ],
  extraEdges: [
    { sourceSlug: "investigation-and-core-belief", targetSlug: "safety-pause", edgeType: "safety", source: [1634, 1651], label: "Crisis signal", condition: { field: "crisisSignal", operator: "equals", value: true }, priority: 1 },
  ],
};
