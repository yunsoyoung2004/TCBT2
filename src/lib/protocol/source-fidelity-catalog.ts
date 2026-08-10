import {
  getTbctSourceExcerpt,
  TBCT_SOURCE_TEXT_HASH,
} from "@/lib/protocol/tbct-source-text.generated";
import type {
  ClinicalStageNode,
  PromptItem,
  PromptItemType,
  SessionCommonRules,
  SessionDefinition,
  SessionPlan,
  SourceFidelityEdge,
  SourceFidelitySessionSeed,
  SourceFidelityStatus,
  SourceTrace,
} from "@/lib/protocol/source-fidelity-types";

export const CANONICAL_PROTOCOL_ID = "tbct-br-001";
export const CANONICAL_SOURCE_VERSION = `tbct-source-${TBCT_SOURCE_TEXT_HASH.slice(0, 12)}`;

const CATALOG_TIMESTAMP = "2025-01-01T00:00:00.000Z";

type SessionSourceMetadata = {
  number: number;
  id: string;
  title: string;
  techniqueName: string;
  acronym?: string;
  sourceLineStart: number;
  sourceLineEnd: number;
  sourceSessionHash: string;
  contextRange: SourceRange;
  roleRange: SourceRange;
  languageRange: SourceRange;
  openingRange: SourceRange;
  requiredActionsRange: SourceRange;
  restrictionsRange: SourceRange;
  safetyRange: SourceRange;
};

type SourceRange = readonly [number, number];

type PromptSpec = {
  slug: string;
  type: PromptItemType;
  source: SourceRange;
  marker?: string;
  patientText?: string;
  outputFields?: string[];
  validation?: Record<string, unknown> | null;
  activationCondition?: Record<string, unknown> | null;
  completionEffect?: Record<string, unknown> | null;
  restrictions?: string[];
  safetyRuleIds?: string[];
  /** Re-asks the same PromptItem (accumulating into its list/rating field)
   * until `completionCondition` is met or `maxIterations` is reached, instead
   * of moving on after a single turn. Used for "rate every item in a list
   * one at a time" and "collect 2-4 pieces of evidence one at a time" steps. */
  executionMode?: PromptItem["executionMode"];
  maxIterations?: number;
  completionCondition?: PromptItem["completionCondition"];
};

type NodeSpec = {
  slug: string;
  title: string;
  type: string;
  source: SourceRange;
  requiredFields?: string[];
  completionRule?: Record<string, unknown>;
  restrictions?: string[];
  safetyRuleIds?: string[];
  prompts: PromptSpec[];
  nextSlug?: string | null;
  terminal?: boolean;
  /** See ClinicalStageNode.participantRationale. Only set on nodes where a
   * brief "why this step" line materially helps comprehension. */
  participantRationale?: string;
};

type EdgeSpec = {
  sourceSlug: string;
  targetSlug: string;
  edgeType: SourceFidelityEdge["edgeType"];
  source: SourceRange;
  label?: string;
  condition?: SourceFidelityEdge["condition"];
  priority?: number;
  isFallback?: boolean;
};

type SessionSpec = {
  metadata: SessionSourceMetadata;
  nodes: NodeSpec[];
  extraEdges?: EdgeSpec[];
};

const SESSION_SOURCE_METADATA: Record<number, SessionSourceMetadata> = {
  1: {
    number: 1,
    id: "tbct-s01",
    title: "Introduction to the TBCT Model",
    techniqueName: "Cognitive Conceptualization Diagram (CCD), Level 1",
    acronym: "CCD Level 1",
    sourceLineStart: 18,
    sourceLineEnd: 222,
    sourceSessionHash: "44c5389a6ad419119c6b2fa0dc61273d5a8ef501bb53e17f13e09b711b3b7a39",
    contextRange: [23, 47],
    roleRange: [32, 47],
    languageRange: [22, 22],
    openingRange: [53, 65],
    requiredActionsRange: [66, 159],
    restrictionsRange: [160, 222],
    safetyRange: [160, 181],
  },
  2: {
    number: 2,
    id: "tbct-s02",
    title: "Problems and Goals",
    techniqueName: "Color-Coded Problem Hierarchy (CCPH) / Color-Coded Goals/Aspirations Hierarchy (CCGH)",
    acronym: "CCPH / CCGH",
    sourceLineStart: 223,
    sourceLineEnd: 429,
    sourceSessionHash: "9703a52d23c715b044b7d7ab198d6eca39d0d8968a4520e7286afcd00f8e3e0b",
    contextRange: [230, 251],
    roleRange: [230, 239],
    languageRange: [230, 239],
    openingRange: [250, 261],
    requiredActionsRange: [263, 387],
    restrictionsRange: [388, 429],
    safetyRange: [411, 429],
  },
  3: {
    number: 3,
    id: "tbct-s03",
    title: "Intrapersonal Thought Record (Intra-TR)",
    techniqueName: "Intrapersonal Thought Record (Intra-TR)",
    acronym: "Intra-TR",
    sourceLineStart: 430,
    sourceLineEnd: 745,
    sourceSessionHash: "2a3686ef5660f60d28fa1a59783e03a3d29763faaf223ad9e0a08e50d5644745",
    contextRange: [471, 482],
    roleRange: [441, 454],
    languageRange: [441, 454],
    openingRange: [455, 470],
    requiredActionsRange: [483, 698],
    restrictionsRange: [699, 724],
    safetyRange: [455, 470],
  },
  4: {
    number: 4,
    id: "tbct-s04",
    title: "Interpersonal Thought Record (Inter-TR)",
    techniqueName: "Interpersonal Thought Record (Inter-TR)",
    acronym: "Inter-TR",
    sourceLineStart: 746,
    sourceLineEnd: 803,
    sourceSessionHash: "0f9d9ba505f420b1bc7bdd78d5491dd07267ed6fa41cea56b0253c511037f573",
    contextRange: [746, 762],
    roleRange: [746, 762],
    languageRange: [746, 762],
    openingRange: [746, 762],
    requiredActionsRange: [763, 786],
    restrictionsRange: [787, 803],
    safetyRange: [787, 803],
  },
  5: {
    number: 5,
    id: "tbct-s05",
    title: "Participation Grid (PG)",
    techniqueName: "Participation Grid (PG)",
    acronym: "PG",
    sourceLineStart: 804,
    sourceLineEnd: 931,
    sourceSessionHash: "313fe5df2c2e15f42053cd95e6194cd834eeaf4273e4849c16de89afda96d236",
    contextRange: [807, 827],
    roleRange: [804, 818],
    languageRange: [819, 826],
    openingRange: [828, 831],
    requiredActionsRange: [832, 879],
    restrictionsRange: [886, 914],
    safetyRange: [915, 931],
  },
  6: {
    number: 6,
    id: "tbct-s06",
    title: "Color-Coded Symptoms Hierarchy (CCSH)",
    techniqueName: "Color-Coded Symptoms Hierarchy (CCSH)",
    acronym: "CCSH",
    sourceLineStart: 932,
    sourceLineEnd: 1275,
    sourceSessionHash: "20aa58141718d98412740adf7d13432203785df845b9c7f6d609a5f7a54e38ac",
    contextRange: [943, 960],
    roleRange: [943, 960],
    languageRange: [961, 989],
    openingRange: [990, 1017],
    requiredActionsRange: [1018, 1206],
    restrictionsRange: [1207, 1275],
    safetyRange: [990, 1017],
  },
  7: {
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
  },
  8: {
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
  },
};

const SOURCE_REVIEW_RANGES: Record<number, Array<{ range: SourceRange; warning: string }>> = {
  6: [
    {
      range: [1207, 1275],
      warning: "The supplied source contains visible encoding/transcription corruption in this excerpt. Preserve it verbatim and require clinical source review before correction.",
    },
  ],
  7: [
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

function sourceText([sourceLineStart, sourceLineEnd]: SourceRange) {
  return getTbctSourceExcerpt(sourceLineStart, sourceLineEnd).trim();
}

function rangesOverlap(left: SourceRange, right: SourceRange) {
  return left[0] <= right[1] && right[0] <= left[1];
}

function traceFor(metadata: SessionSourceMetadata, sourceSection: string, range: SourceRange): SourceTrace {
  const reviewItems = (SOURCE_REVIEW_RANGES[metadata.number] ?? []).filter((item) => rangesOverlap(range, item.range));

  return {
    sourceDocument: "TBCT pasted source text",
    sourceSession: `Session ${String(metadata.number).padStart(2, "0")}`,
    sourceSection,
    sourceLineStart: range[0],
    sourceLineEnd: range[1],
    sourceTextHash: TBCT_SOURCE_TEXT_HASH,
    sourceSessionHash: metadata.sourceSessionHash,
    importedVersion: CANONICAL_SOURCE_VERSION,
    ...(reviewItems.length > 0
      ? {
          rawSourceExcerpt: reviewItems.map((item) => sourceText(item.range)).join("\n\n"),
          reviewWarnings: reviewItems.map((item) => item.warning),
        }
      : {}),
  };
}

function fidelityFor(metadata: SessionSourceMetadata, range: SourceRange, isolatedPrompt = false): Exclude<SourceFidelityStatus, "source_missing"> {
  if ((SOURCE_REVIEW_RANGES[metadata.number] ?? []).some((item) => rangesOverlap(range, item.range))) {
    return "review_required";
  }
  return isolatedPrompt ? "exact" : "structured_from_source";
}

function quotedSourceText(range: SourceRange, marker?: string) {
  const text = sourceText(range);
  if (!marker) return { text, isolatedPrompt: false };

  const markerIndex = text.indexOf(marker);
  if (markerIndex < 0) return { text, isolatedPrompt: false };

  const lineStart = text.lastIndexOf("\n", markerIndex) + 1;
  const nextLineBreak = text.indexOf("\n", markerIndex);
  const lineEnd = nextLineBreak < 0 ? text.length : nextLineBreak;
  const markerLine = text.slice(lineStart, lineEnd);
  const markerIndexInLine = markerIndex - lineStart;
  const quoteStart = markerLine.lastIndexOf('"', markerIndexInLine);
  const quoteEnd = markerLine.indexOf('"', markerIndexInLine + marker.length);
  if (quoteStart < 0 || quoteEnd < 0 || quoteEnd <= quoteStart + 1) {
    return markerLine.includes('"') ? { text, isolatedPrompt: false } : { text: markerLine.trim(), isolatedPrompt: true };
  }

  return { text: markerLine.slice(quoteStart + 1, quoteEnd).trim(), isolatedPrompt: true };
}

function nodeId(sessionNumber: number, index: number, slug: string) {
  return `tbct-s${String(sessionNumber).padStart(2, "0")}-n${String(index).padStart(2, "0")}-${slug}`;
}

function promptId(sessionNumber: number, nodeIndex: number, promptIndex: number, slug: string) {
  return `tbct-s${String(sessionNumber).padStart(2, "0")}-n${String(nodeIndex).padStart(2, "0")}-p${String(promptIndex).padStart(2, "0")}-${slug}`;
}

function edgeId(sessionNumber: number, sourceSlug: string, targetSlug: string) {
  return `tbct-s${String(sessionNumber).padStart(2, "0")}-e-${sourceSlug}-to-${targetSlug}`;
}

function buildSessionSeed(spec: SessionSpec): SourceFidelitySessionSeed {
  const { metadata } = spec;
  const resolvedNodes = spec.nodes.map((node, index) => ({ ...node, id: nodeId(metadata.number, index + 1, node.slug), index: index + 1 }));
  const nodeBySlug = new Map(resolvedNodes.map((node) => [node.slug, node]));
  const defaultEdges: EdgeSpec[] = resolvedNodes.flatMap((node, index) => {
    const nextNode = node.nextSlug === null ? undefined : node.nextSlug ? nodeBySlug.get(node.nextSlug) : resolvedNodes[index + 1];
    if (!nextNode || node.terminal) return [];
    return [{ sourceSlug: node.slug, targetSlug: nextNode.slug, edgeType: "default", source: node.source, priority: 100, isFallback: false }];
  });
  const edgeSpecs = [...defaultEdges, ...(spec.extraEdges ?? [])];

  const promptItems: PromptItem[] = resolvedNodes.flatMap((node) =>
    node.prompts.map((prompt, promptIndex) => {
      const promptText = quotedSourceText(prompt.source, prompt.marker);
      const aiMsg = promptText.text || sourceText(prompt.source);
      const shortAiMsg = aiMsg.split('\n')[0] || aiMsg.substring(0, 200);
      
      return {
        id: promptId(metadata.number, node.index, promptIndex + 1, prompt.slug),
        protocolId: CANONICAL_PROTOCOL_ID,
        sessionId: metadata.id,
        nodeId: node.id,
        order: promptIndex + 1,
        type: prompt.type,
        verbatimText: promptText.text,
        editableText: promptText.text || sourceText(prompt.source),
        aiInstruction: shortAiMsg,
        fallbackPatientText: prompt.patientText,
        markerHint: prompt.marker,
        activationCondition: prompt.activationCondition ?? null,
        outputFields: prompt.outputFields ?? [],
        validation: prompt.validation ?? null,
        executionMode: prompt.executionMode,
        maxIterations: prompt.maxIterations,
        completionCondition: prompt.completionCondition,
        completionEffect: prompt.completionEffect ?? { type: "advance_prompt" },
        restrictions: prompt.restrictions ?? node.restrictions ?? [],
        safetyRuleIds: prompt.safetyRuleIds ?? node.safetyRuleIds ?? [],
        sourceTrace: traceFor(metadata, `${node.title}: ${prompt.slug}`, prompt.source),
        sourceFidelityStatus: fidelityFor(metadata, prompt.source, promptText.isolatedPrompt),
        origin: "source_imported",
        sourceHash: TBCT_SOURCE_TEXT_HASH,
        status: "active",
        createdAt: CATALOG_TIMESTAMP,
        updatedAt: CATALOG_TIMESTAMP,
        updatedBy: "TBCT source import",
      };
    }),
  );

  const nodes: ClinicalStageNode[] = resolvedNodes.map((node, index) => {
    const nextNode = !node.terminal ? (node.nextSlug === null ? undefined : node.nextSlug ? nodeBySlug.get(node.nextSlug) : resolvedNodes[index + 1]) : undefined;
    const branchRules = edgeSpecs
      .filter((edge) => edge.sourceSlug === node.slug && edge.edgeType !== "default")
      .map((edge) => ({ edgeType: edge.edgeType, label: edge.label, condition: edge.condition, target: nodeBySlug.get(edge.targetSlug)?.id }));

    return {
      id: node.id,
      protocolId: CANONICAL_PROTOCOL_ID,
      sessionId: metadata.id,
      title: node.title,
      type: node.type,
      clinicalPurpose: sourceText(node.source),
      participantRationale: node.participantRationale,
      position: { x: 180 + (index % 2) * 340, y: 100 + index * 190 },
      promptItemIds: promptItems.filter((item) => item.nodeId === node.id).map((item) => item.id),
      requiredFields: node.requiredFields ?? [],
      completionRule: node.completionRule ?? { type: "all_required_prompt_items_completed" },
      branchRules,
      restrictions: node.restrictions ?? [],
      safetyRuleIds: node.safetyRuleIds ?? [],
      defaultNextNodeId: nextNode?.id,
      sourceTrace: traceFor(metadata, node.title, node.source),
      sourceFidelityStatus: fidelityFor(metadata, node.source),
      status: "active",
      createdAt: CATALOG_TIMESTAMP,
      updatedAt: CATALOG_TIMESTAMP,
    };
  });

  const edges: SourceFidelityEdge[] = edgeSpecs.map((edge) => {
    const sourceNode = nodeBySlug.get(edge.sourceSlug);
    const targetNode = nodeBySlug.get(edge.targetSlug);
    if (!sourceNode || !targetNode) {
      throw new Error(`Invalid canonical source edge: ${metadata.id}/${edge.sourceSlug}->${edge.targetSlug}`);
    }
    return {
      id: edgeId(metadata.number, edge.sourceSlug, edge.targetSlug),
      protocolId: CANONICAL_PROTOCOL_ID,
      sessionId: metadata.id,
      source: sourceNode.id,
      target: targetNode.id,
      edgeType: edge.edgeType,
      label: edge.label,
      condition: edge.condition,
      priority: edge.priority ?? (edge.edgeType === "default" ? 100 : 10),
      isFallback: edge.isFallback ?? edge.edgeType === "fallback",
      sourceTrace: traceFor(metadata, `${sourceNode.title} to ${targetNode.title}`, edge.source),
    };
  });

  const startNode = nodes.find((node) => node.type === "session_start") ?? nodes[0];
  const completionNode = nodes.find((node) => node.type === "session_complete") ?? nodes[nodes.length - 1];
  if (!startNode || !completionNode) {
    throw new Error(`Canonical source session ${metadata.id} is missing a start or completion node.`);
  }

  const sourceFidelityStatus = fidelityFor(metadata, [metadata.sourceLineStart, metadata.sourceLineEnd]);
  const commonRules: SessionCommonRules = {
    sessionTitle: metadata.title,
    techniqueName: metadata.techniqueName,
    roleAndStance: sourceText(metadata.roleRange),
    sessionObjective: sourceText(metadata.contextRange),
    languageRules: [sourceText(metadata.languageRange)],
    openingRules: [sourceText(metadata.openingRange)],
    sessionWideRequiredActions: [sourceText(metadata.requiredActionsRange)],
    sessionWideRestrictions: [sourceText(metadata.restrictionsRange)],
    sessionWideSafetyRules: [sourceText(metadata.safetyRange)],
    sourceTrace: traceFor(metadata, "Session common rules", [metadata.sourceLineStart, metadata.sourceLineEnd]),
    sourceFidelityStatus,
    version: CANONICAL_SOURCE_VERSION,
    status: sourceFidelityStatus === "review_required" ? "safety_review" : "clinical_review",
    clinicalContext: sourceText(metadata.contextRange),
    previousSessionContext: sourceText(metadata.contextRange),
    languageAndTerminologyRules: sourceText(metadata.languageRange),
    toneAndInteractionRules: sourceText(metadata.roleRange),
    safetyAndEscalationRules: sourceText(metadata.safetyRange),
    defaultModalityRules: ["text"],
  };

  const definition: SessionDefinition = {
    id: metadata.id,
    protocolId: CANONICAL_PROTOCOL_ID,
    number: metadata.number,
    title: metadata.title,
    techniqueName: metadata.techniqueName,
    acronym: metadata.acronym,
    contextAndPurpose: sourceText(metadata.contextRange),
    roleAndStance: sourceText(metadata.roleRange),
    sessionObjective: sourceText(metadata.requiredActionsRange),
    languageRules: [sourceText(metadata.languageRange)],
    openingRules: [sourceText(metadata.openingRange)],
    sessionWideRequiredActions: [sourceText(metadata.requiredActionsRange)],
    sessionWideRestrictions: [sourceText(metadata.restrictionsRange)],
    sessionWideSafetyRules: [sourceText(metadata.safetyRange)],
    startNodeId: startNode.id,
    completionNodeId: completionNode.id,
    sourceTrace: traceFor(metadata, "Complete session source", [metadata.sourceLineStart, metadata.sourceLineEnd]),
    sourceFidelityStatus,
    status: "reviewed",
    createdAt: CATALOG_TIMESTAMP,
    updatedAt: CATALOG_TIMESTAMP,
    technique: metadata.techniqueName,
    clinicalPurpose: sourceText(metadata.contextRange),
    roleInstruction: sourceText(metadata.roleRange),
    nodeCount: nodes.length,
    promptCount: promptItems.length,
    validationStatus: sourceFidelityStatus === "review_required" ? "review" : "ready",
  };

  return { definition, commonRules, nodes, promptItems, edges };
}

const SESSION_01_TO_04_SPECS: SessionSpec[] = [
  {
    metadata: SESSION_SOURCE_METADATA[1],
    nodes: [
      {
        slug: "mandatory-opening",
        title: "Session Opening - Mandatory First Move",
        type: "session_start",
        source: [53, 74],
        requiredFields: ["sessionOpeningAcknowledged", "situationThoughtDistinction"],
        restrictions: [sourceText([53, 65])],
        prompts: [
          { slug: "warm-acknowledgement", type: "opening", source: [53, 65], marker: "That sounds like a lot to be carrying", completionEffect: { type: "record_opening_acknowledgement" } },
          { slug: "telegraphic-situation", type: "question", source: [66, 74], marker: "How would you describe what is happening right now", outputFields: ["situationThoughtDistinction"], validation: { kind: "participant_articulated_distinction" } },
        ],
      },
      {
        slug: "situation-thought-distinction",
        title: "Step 1 - Distinguish Situation from Thoughts and Emotions",
        type: "question",
        source: [66, 74],
        requiredFields: ["situationThoughtDistinction"],
        restrictions: [sourceText([66, 74])],
        participantRationale: "This helps separate what actually happened from the thought your mind added about it — that difference is the foundation the rest of this program builds on.",
        prompts: [
          // NOT outputFields: ["situationThoughtDistinction"] -- source
          // (tbct-source-text.generated.ts:71-76) is explicit that this
          // step is a Socratic check on whether the participant can TELL
          // situation apart from thought ("gently explore whether what
          // they said was a description (situation) or an interpretation
          // (thought)"), unconditionally re-asked after the real situation
          // answer from telegraphic-situation above. Unlike every other
          // "re-ask the same field" clarification in this catalog (e.g.
          // specific-moment/emotion-to-thought-redirect below), this one had
          // no activationCondition gating it to only the cases that
          // actually needed correcting -- it ran for every participant and
          // overwrote the worksheet's "My situation" box with whatever they
          // said in reply to "is that a situation or a thought?" (e.g. "I
          // think it's a situation"), discarding their real answer.
          { slug: "situation-or-thought", type: "clarification", source: [66, 74], marker: "That's interesting" },
          { slug: "personal-example-redirect", type: "transition", source: [73, 74], marker: "That's a great example", completionEffect: { type: "redirect_to_three_person_example" } },
        ],
      },
      {
        slug: "three-person-example",
        title: "Step 2 - Three-Person Example",
        type: "orientation",
        source: [75, 85],
        requiredFields: ["threePersonPreviewComplete"],
        restrictions: [sourceText([75, 85])],
        participantRationale: "Three people hearing the exact same words can react in completely different ways. Walking through their reactions makes it easier to see how a thought, not just what happened, shapes how someone feels and acts.",
        prompts: [
          { slug: "preview-candidates", type: "explanation", source: [75, 85], marker: "I'm going to walk you through three different people", outputFields: ["threePersonPreviewComplete"] },
          {
            slug: "set-up-candidates",
            type: "instruction",
            source: [82, 85],
            marker: "Let's pretend that I am not a therapist",
            patientText: "Let's pretend that I am not a therapist but a businessperson. I have a job opening, and I will give the same compliment to three candidates: ‘I read your résumé, and you seem to be a capable and competent person.’",
          },
        ],
      },
      {
        slug: "first-candidate",
        title: "Step 2 - First Candidate Full Cycle",
        type: "dialogue",
        source: [86, 92],
        requiredFields: ["candidateOneEmotion", "candidateOneThought", "candidateOneBehavior", "candidateOneReaction", "candidateOneReturningArrows"],
        restrictions: [sourceText([86, 92])],
        prompts: [
          { slug: "candidate-one-emotion", type: "question", source: [86, 92], marker: "Upon hearing this compliment", outputFields: ["candidateOneEmotion"] },
          { slug: "candidate-one-thought", type: "question", source: [86, 92], marker: "For them to feel that way", outputFields: ["candidateOneThought"] },
          { slug: "candidate-one-behavior", type: "question", source: [86, 92], marker: "With that thought and that emotion", outputFields: ["candidateOneBehavior"] },
          { slug: "candidate-one-reaction", type: "question", source: [86, 92], marker: "Do you think the interviewer's reaction", patientText: "Do you think the interviewer's reaction to that behavior would be positive or negative?", outputFields: ["candidateOneReaction"], validation: { kind: "enum", values: ["positive", "negative"] } },
          { slug: "candidate-one-thought-arrow", type: "follow_up", source: [86, 92], marker: "And when the interviewer reacts positively", outputFields: ["candidateOneReturningArrows"] },
          { slug: "candidate-one-emotion-arrow", type: "follow_up", source: [86, 92], marker: "And when that thought gets stronger", outputFields: ["candidateOneReturningArrows"] },
          { slug: "candidate-one-behavior-arrow", type: "follow_up", source: [86, 92], marker: "And when the emotion grows", outputFields: ["candidateOneReturningArrows"] },
        ],
      },
      {
        slug: "second-candidate",
        title: "Step 2 - Second Candidate Streamlined Cycle",
        type: "dialogue",
        source: [93, 104],
        requiredFields: ["candidateTwoThought", "candidateTwoEmotion", "candidateTwoBehavior", "candidateTwoReaction", "candidateTwoCycleComplete"],
        restrictions: [sourceText([93, 104])],
        prompts: [
          { slug: "candidate-two-same-situation", type: "question", source: [93, 104], marker: "Now I'd like to put a second person", outputFields: ["candidateTwoSameSituation"] },
          { slug: "candidate-two-emotion", type: "question", source: [93, 104], marker: "Upon hearing this, do you think it's possible", outputFields: ["candidateTwoEmotion"], validation: { kind: "text", siblingField: "candidateOneEmotion" } },
          { slug: "candidate-two-possibility", type: "clarification", source: [93, 104], marker: "I'm talking about possibility", outputFields: ["candidateTwoPossibility"] },
          {
            slug: "candidate-two-emotion-recheck",
            type: "clarification",
            source: [93, 104],
            patientText: "That's one possibility. This second candidate is being told they seem ‘sad or discouraged’ rather than confident and capable — quite different wording than the first candidate heard. Given that, what do you think this candidate might feel?",
            activationCondition: { field: "candidateTwoEmotionRepeatsSibling", operator: "equals", value: true },
            outputFields: ["candidateTwoEmotion"],
          },
          { slug: "candidate-two-thought", type: "question", source: [93, 104], marker: "For them to feel sad or discouraged", outputFields: ["candidateTwoThought"] },
          // Explicit patientText because quotedSourceText's marker-quote
          // extraction doesn't cleanly isolate this line the way it does for
          // candidate-three-behavior's near-identical sentence -- without it,
          // the generic fallback generator produced the ungrammatical
          // "With that thought and that sadness, what they would do?"
          { slug: "candidate-two-behavior", type: "question", source: [93, 104], marker: "With that thought and that sadness", patientText: "With that thought and that sadness, what behavior would you expect from this candidate?", outputFields: ["candidateTwoBehavior"] },
          { slug: "candidate-two-reaction", type: "question", source: [93, 104], marker: "Do you think the interviewer's reaction", outputFields: ["candidateTwoReaction"], validation: { kind: "enum", values: ["positive", "negative"] } },
          { slug: "candidate-two-cycle", type: "confirmation", source: [93, 104], marker: "And when the interviewer reacts negatively", outputFields: ["candidateTwoCycleComplete"] },
        ],
      },
      {
        slug: "third-candidate",
        title: "Step 2 - Third Candidate Streamlined Cycle",
        type: "dialogue",
        source: [105, 117],
        requiredFields: ["candidateThreeThought", "candidateThreeEmotion", "candidateThreeBehavior", "candidateThreeReaction", "threePersonExampleComplete"],
        restrictions: [sourceText([105, 117])],
        prompts: [
          { slug: "candidate-three-same-situation", type: "question", source: [105, 117], marker: "And here's the third and last one", outputFields: ["candidateThreeSameSituation"] },
          { slug: "candidate-three-emotion", type: "question", source: [105, 117], marker: "Do you think it's possible that this third candidate", outputFields: ["candidateThreeEmotion"], validation: { kind: "text", siblingField: "candidateOneEmotion" } },
          {
            slug: "candidate-three-emotion-recheck",
            type: "clarification",
            source: [105, 117],
            patientText: "This third candidate is being told they seem ‘irritated or hostile’ — a different reaction again from the first two candidates. Given that wording, what do you think this candidate might feel?",
            activationCondition: { field: "candidateThreeEmotionRepeatsSibling", operator: "equals", value: true },
            outputFields: ["candidateThreeEmotion"],
          },
          { slug: "candidate-three-thought", type: "question", source: [105, 117], marker: "For them to feel irritated or hostile", outputFields: ["candidateThreeThought"] },
          { slug: "candidate-three-behavior", type: "question", source: [105, 117], marker: "With that thought and that irritation", outputFields: ["candidateThreeBehavior"] },
          { slug: "candidate-three-reaction", type: "question", source: [105, 117], marker: "Do you think the interviewer's reaction", outputFields: ["candidateThreeReaction"], validation: { kind: "enum", values: ["positive", "negative"] } },
          { slug: "candidate-three-cycle", type: "confirmation", source: [105, 117], marker: "And when the interviewer reacts negatively", outputFields: ["threePersonExampleComplete"], completionEffect: { type: "set_field", field: "threePersonExampleComplete", value: true } },
        ],
      },
      {
        slug: "three-person-conclusion",
        title: "Step 2 - Three-Person Conclusion",
        type: "summary",
        source: [118, 129],
        requiredFields: ["threePersonModelInsight"],
        restrictions: [sourceText([118, 129])],
        prompts: [
          { slug: "three-person-observation", type: "question", source: [118, 129], marker: "Three different people heard exactly", outputFields: ["threePersonModelInsight"] },
          { slug: "situation-thought-emotion-link", type: "question", source: [118, 129], marker: "What does that tell you", outputFields: ["threePersonModelInsight"] },
          { slug: "return-to-personal-example", type: "transition", source: [118, 129], marker: "Now, let's go back" },
        ],
      },
      {
        slug: "personal-returning-arrows",
        title: "Step 3 - Exploring the Participant's Own Cycle",
        type: "dialogue",
        source: [130, 140],
        requiredFields: ["personalThoughtEmotionLink", "personalEmotionBehaviorLink", "personalBehaviorSituationLink"],
        restrictions: [sourceText([130, 140])],
        prompts: [
          { slug: "thought-to-emotion", type: "question", source: [130, 140], marker: "When that thought gets stronger", outputFields: ["personalThoughtEmotionLink"] },
          { slug: "emotion-to-behavior", type: "question", source: [130, 140], marker: "When the emotion grows, what happens to your behavior", outputFields: ["personalEmotionBehaviorLink"] },
          { slug: "behavior-to-situation", type: "question", source: [130, 140], marker: "When you behaved that way", outputFields: ["personalBehaviorSituationLink"] },
          { slug: "situation-to-thought", type: "question", source: [130, 140], marker: "And when the situation didn't change", outputFields: ["personalSituationThoughtLink"] },
          { slug: "outcome-gap", type: "follow_up", source: [130, 140], marker: "So what does it tell you that what you feared", activationCondition: { field: "fearedOutcomeDidNotMaterialize", operator: "equals", value: true }, outputFields: ["outcomeGapInsight"] },
        ],
      },
      {
        slug: "participant-summary",
        title: "Step 4 - Participant Summary",
        type: "summary",
        source: [141, 144],
        requiredFields: ["participantSummary"],
        prompts: [
          { slug: "participant-summary", type: "summary", source: [141, 144], marker: "Before we move on", outputFields: ["participantSummary"], validation: { kind: "participant_summary_required" } },
        ],
      },
      {
        slug: "cognitive-distortions",
        title: "Step 5 - Introducing Cognitive Distortions",
        type: "question",
        source: [145, 155],
        requiredFields: ["distortionListAvailable", "participantSelectedDistortions"],
        restrictions: [sourceText([145, 155])],
        participantRationale: "Automatic thoughts often follow a handful of common patterns. Naming the pattern in your own thought makes it easier to question later, rather than just having it feel automatically true.",
        prompts: [
          { slug: "confirm-list", type: "question", source: [145, 155], marker: "Do you have the cognitive distortions list", outputFields: ["distortionListAvailable"], validation: { kind: "boolean" } },
          { slug: "read-distortions", type: "instruction", source: [145, 155], marker: "These negative automatic thoughts", outputFields: ["participantSelectedDistortions"], validation: { kind: "min_items", minItems: 2, maxItems: 3 } },
          { slug: "identify-distortion", type: "question", source: [145, 155], marker: "Looking at what went through your mind", outputFields: ["participantSelectedDistortions"] },
          { slug: "meaning-of-distortion", type: "question", source: [145, 155], marker: "If you discovered that this thought", outputFields: ["distortionMeaning"] },
        ],
      },
      {
        slug: "daily-observation-closing",
        title: "Step 6 - Closing the Session",
        type: "session_complete",
        source: [156, 159],
        restrictions: [sourceText([160, 222])],
        terminal: true,
        prompts: [
          {
            slug: "daily-observation-practice",
            type: "worksheet_instruction",
            source: [156, 159],
            patientText: "Before our next session, please practice noticing your automatic thoughts each day with the cognitive distortions list, using its personal-examples column. In a future session, your therapist will introduce the Intrapersonal Thought Record to help you work with these thoughts more deeply. Thank you for your work today.",
            outputFields: ["dailyObservationPractice"],
            completionEffect: { type: "complete_session" },
          },
        ],
      },
    ],
  },
  {
    metadata: SESSION_SOURCE_METADATA[2],
    nodes: [
      {
        slug: "opening",
        title: "Opening",
        type: "session_start",
        source: [250, 261],
        requiredFields: ["openingMode"],
        prompts: [
          { slug: "first-session-opening", type: "opening", source: [250, 261], marker: "Hi! I'm here to help you map out", outputFields: ["openingMode"] },
          { slug: "returning-opening", type: "opening", source: [250, 261], marker: "Welcome back", activationCondition: { field: "returningParticipant", operator: "equals", value: true }, outputFields: ["openingMode"] },
          { slug: "between-session-bridge", type: "follow_up", source: [250, 261], marker: "How did that go", activationCondition: { field: "returningParticipant", operator: "equals", value: true }, outputFields: ["betweenSessionWork"] },
          { slug: "assessment-transition", type: "transition", source: [250, 261], marker: "It's great to hear", activationCondition: { field: "returningParticipant", operator: "equals", value: true } },
        ],
      },
      {
        slug: "elicit-problems",
        title: "Step 1 - Elicit Problems",
        type: "question",
        source: [263, 279],
        requiredFields: ["problems"],
        restrictions: [sourceText([263, 279])],
        participantRationale: "Naming problems clearly, one at a time, makes it possible to track and work on each one instead of feeling weighed down by everything at once.",
        prompts: [
          { slug: "problem-framing", type: "question", source: [263, 279], marker: "Over the next five or six months", outputFields: ["problems"], validation: { kind: "array", minItems: 1, maxItems: 5 } },
          { slug: "problem-home-work-relationships", type: "follow_up", source: [263, 279], marker: "Is there anything going on at home", outputFields: ["problems"] },
          { slug: "problem-avoidance", type: "follow_up", source: [263, 279], marker: "Are there things you've been avoiding", outputFields: ["problems"] },
          { slug: "problem-therapy-goal", type: "follow_up", source: [263, 279], marker: "What brought you to therapy", outputFields: ["problems"] },
          { slug: "problem-forward-importance", type: "follow_up", source: [263, 279], marker: "Think about what's affecting you", outputFields: ["problems"] },
          { slug: "problem-confirmation", type: "confirmation", source: [263, 279], marker: "Got it", outputFields: ["problems"] },
          { slug: "problem-reframe", type: "clarification", source: [263, 279], marker: "That sounds really hard", activationCondition: { field: "problemOutsideParticipantControl", operator: "equals", value: true }, outputFields: ["problemFraming"] },
        ],
      },
      {
        slug: "hidden-problems",
        title: "Step 1b - X, Y, Z Strategy",
        type: "question",
        source: [280, 293],
        requiredFields: ["privateProblemPlaceholders"],
        restrictions: [sourceText([280, 293])],
        prompts: [
          { slug: "offer-private-placeholders", type: "question", source: [280, 293], marker: "Before we move on to rating your problems", outputFields: ["privateProblemPlaceholders"], validation: { kind: "private_placeholder_labels", allowed: ["X", "Y", "Z"] } },
          { slug: "acknowledge-private-placeholder", type: "confirmation", source: [280, 293], marker: "Thank you for letting me know", activationCondition: { field: "privateProblemAdded", operator: "equals", value: true } },
          { slug: "continue-without-placeholder", type: "transition", source: [280, 293], marker: "Of course", activationCondition: { field: "privateProblemAdded", operator: "equals", value: false } },
        ],
      },
      {
        slug: "problem-scale",
        title: "Step 2 - Problem Scale",
        type: "assessment",
        source: [294, 313],
        requiredFields: ["problemScalePresented"],
        restrictions: [sourceText([294, 313])],
        participantRationale: "Rating each problem helps us see which ones matter most right now, so we know where to focus first.",
        prompts: [
          { slug: "rating-card-check", type: "question", source: [294, 313], marker: "Do you have the rating scale card", outputFields: ["problemScaleCardAvailable"] },
          { slug: "six-anchor-problem-scale", type: "instruction", source: [294, 313], marker: "Now I'll ask you to rate each problem", outputFields: ["problemScalePresented"], validation: { kind: "exact_scale_anchors", min: 0, max: 5 } },
          { slug: "discomfort-distress-distinction", type: "explanation", source: [294, 313], marker: "Notice something important about this scale", outputFields: ["problemScaleDistinctionAcknowledged"] },
        ],
      },
      {
        slug: "rate-problems",
        title: "Step 3 - Rate Each Problem",
        type: "assessment",
        source: [314, 318],
        requiredFields: ["problemRatings"],
        restrictions: [sourceText([314, 318])],
        prompts: [
          {
            slug: "reflect-problem-score",
            type: "rating",
            source: [314, 318],
            marker: "Thank you. So [problem / X / Y / Z] is a [score]",
            outputFields: ["problemRatings"],
            validation: { kind: "rating", min: 0, max: 5, includeColor: true },
            // Re-asks this same prompt once per listed problem instead of
            // stopping after a single rating, so every problem the participant
            // named actually gets its own score. Patient-facing text is
            // supplied dynamically by contextualPatientText in
            // runtime-static-message.ts (reflectThenAskForNextRating) --
            // this marker was previously missing its closing "]", which
            // left the [problem/score/color] bracket template as the
            // resolved verbatimText and made the runtime-release-normalizer
            // fallback generator produce a garbled "Thank you. So [problem,
            // what comes to mind for you?" instead.
            executionMode: "repeat_until",
            maxIterations: 5,
            completionCondition: { kind: "field", field: "allProblemsRated", operator: "equals", value: true },
          },
          { slug: "acknowledge-distress", type: "reflection", source: [314, 318], marker: "That sounds really hard. I appreciate", activationCondition: { field: "currentProblemScore", operator: "in", value: [4, 5] } },
          { slug: "acknowledge-manageable", type: "reflection", source: [314, 318], marker: "That's good to hear", activationCondition: { field: "currentProblemScore", operator: "in", value: [0, 1] } },
          { slug: "score-clarification", type: "clarification", source: [314, 318], marker: "When you think about it as", activationCondition: { field: "currentProblemScoreUncertain", operator: "equals", value: true } },
        ],
      },
      {
        slug: "problem-summary",
        title: "Step 4 - Problem Summary and Distress Count",
        type: "assessment",
        source: [319, 333],
        requiredFields: ["totalProblemScore", "yellowRedProblemsCount"],
        restrictions: [sourceText([319, 333])],
        prompts: [
          { slug: "problem-total", type: "summary", source: [319, 333], marker: "Your total problem score today", outputFields: ["totalProblemScore", "yellowRedProblemsCount"], validation: { kind: "calculated_problem_totals" } },
          { slug: "problem-total-personal", type: "reflection", source: [319, 333], marker: "This number is very personal" },
          { slug: "transition-to-goals", type: "transition", source: [319, 333], marker: "You've done really well" },
        ],
      },
      {
        slug: "elicit-goals",
        title: "Step 6 - Elicit Goals",
        type: "question",
        source: [334, 350],
        requiredFields: ["goals"],
        restrictions: [sourceText([334, 350])],
        participantRationale: "Naming what you're working toward, not just what's wrong, gives therapy a direction to move in rather than only a list of things to fix.",
        prompts: [
          { slug: "goal-framing", type: "question", source: [334, 350], marker: "Over the next five or six months, if therapy goes really well", outputFields: ["goals"], validation: { kind: "array", minItems: 1, maxItems: 5 } },
          { slug: "goal-life-change", type: "follow_up", source: [334, 350], marker: "If therapy goes really well, what would be different", outputFields: ["goals"] },
          { slug: "goal-difficult-action", type: "follow_up", source: [334, 350], marker: "Are there things you've been wanting", outputFields: ["goals"] },
          { slug: "goal-freedom", type: "follow_up", source: [334, 350], marker: "What would make you feel more at ease", outputFields: ["goals"] },
          { slug: "goal-dream", type: "follow_up", source: [334, 350], marker: "Are there things you've always wanted", outputFields: ["goals"] },
          { slug: "goal-overlap", type: "clarification", source: [334, 350], marker: "That sounds like both a problem", activationCondition: { field: "goalOverlapsProblem", operator: "equals", value: true }, outputFields: ["goalProblemOverlap"] },
          { slug: "goal-confirmation", type: "confirmation", source: [334, 350], marker: "That's a wonderful goal", outputFields: ["goals"] },
        ],
      },
      {
        slug: "goal-scale",
        title: "Step 7 - Goal Scale",
        type: "assessment",
        source: [351, 368],
        requiredFields: ["goalScalePresented"],
        restrictions: [sourceText([351, 368])],
        prompts: [
          { slug: "goal-rating-card-check", type: "question", source: [351, 368], marker: "Do you still have the rating card", outputFields: ["goalScaleCardAvailable"] },
          { slug: "six-anchor-goal-scale", type: "instruction", source: [351, 368], marker: "Now let's rate how difficult", outputFields: ["goalScalePresented"], validation: { kind: "exact_scale_anchors", min: 0, max: 5 } },
        ],
      },
      {
        slug: "rate-goals",
        title: "Step 8 - Rate Each Goal",
        type: "assessment",
        source: [369, 376],
        requiredFields: ["goalRatings"],
        restrictions: [sourceText([369, 376])],
        prompts: [
          {
            slug: "reflect-goal-score",
            type: "rating",
            source: [369, 376],
            marker: "So pursuing [goal]",
            outputFields: ["goalRatings"],
            validation: { kind: "rating", min: 0, max: 5, includeColor: true },
            executionMode: "repeat_until",
            maxIterations: 5,
            completionCondition: { kind: "field", field: "allGoalsRated", operator: "equals", value: true },
          },
          { slug: "acknowledge-difficult-goal", type: "reflection", source: [369, 376], marker: "That's a really meaningful goal", activationCondition: { field: "currentGoalScore", operator: "in", value: [4, 5] } },
          { slug: "acknowledge-achieved-goal", type: "reflection", source: [369, 376], marker: "Wonderful", activationCondition: { field: "currentGoalScore", operator: "equals", value: 0 } },
        ],
      },
      {
        slug: "goal-summary",
        title: "Step 9 - Goal Summary and Distress Count",
        type: "assessment",
        source: [377, 387],
        requiredFields: ["totalGoalsScore", "yellowRedGoalsCount"],
        prompts: [
          { slug: "goal-total", type: "summary", source: [377, 387], marker: "Your total goals score today", outputFields: ["totalGoalsScore", "yellowRedGoalsCount"], validation: { kind: "calculated_goal_totals" } },
          { slug: "goal-total-personal", type: "reflection", source: [377, 387], marker: "Like your problem score" },
        ],
      },
      {
        slug: "closing",
        title: "Closing Summary",
        type: "session_complete",
        source: [388, 429],
        restrictions: [sourceText([388, 429])],
        terminal: true,
        prompts: [
          { slug: "thanks", type: "closing", source: [388, 429], marker: "Thank you so much for sharing", outputFields: ["closingAcknowledgement"] },
          { slug: "recorded-summary", type: "summary", source: [388, 429], marker: "Your problems and goals are now recorded", outputFields: ["problemRatings", "goalRatings", "totalProblemScore", "totalGoalsScore"] },
          { slug: "final-score-summary", type: "closing", source: [388, 429], marker: "Your total problem score is", completionEffect: { type: "complete_session" } },
        ],
      },
    ],
  },
  {
    metadata: SESSION_SOURCE_METADATA[3],
    nodes: [
      {
        slug: "safety-check",
        title: "Safety Protocol",
        type: "session_start",
        source: [455, 470],
        requiredFields: ["safetyCheck"],
        safetyRuleIds: ["TBCT-S03-CRISIS-PAUSE"],
        restrictions: [sourceText([455, 470])],
        nextSlug: "intra-tr-introduction",
        prompts: [
          { slug: "safety-check", type: "opening", source: [455, 470], marker: "Before we start, how are you doing today", outputFields: ["safetyCheck"], validation: { kind: "safety_check" }, completionEffect: { type: "evaluate_safety" }, safetyRuleIds: ["TBCT-S03-CRISIS-PAUSE"] },
        ],
      },
      {
        slug: "intra-tr-introduction",
        title: "Introducing the Intra-TR",
        type: "orientation",
        source: [483, 494],
        requiredFields: ["intraTrIntroductionComplete"],
        restrictions: [sourceText([483, 494])],
        prompts: [
          { slug: "fourteen-question-introduction", type: "opening", source: [483, 494], marker: "Today we are going to work with something called", outputFields: ["intraTrIntroductionComplete"] },
          { slug: "ccd-connection", type: "explanation", source: [483, 494], marker: "You may remember the diagram", outputFields: ["intraTrIntroductionComplete"] },
        ],
      },
      {
        slug: "q1-situation",
        title: "Q1 - Situation",
        type: "question",
        source: [501, 510],
        requiredFields: ["situation"],
        prompts: [
          { slug: "describe-situation", type: "question", source: [501, 510], marker: "Can you describe a recent situation", outputFields: ["situation"], validation: { kind: "text" } },
          { slug: "specific-moment", type: "clarification", source: [501, 510], marker: "Can you give me a specific moment", activationCondition: { field: "situationIsAbstract", operator: "equals", value: true }, outputFields: ["situation"] },
        ],
      },
      {
        slug: "q2-automatic-thought",
        title: "Q2a - Automatic Thought",
        type: "question",
        source: [511, 528],
        requiredFields: ["automaticThought"],
        nextSlug: "q2b-at-belief",
        prompts: [
          { slug: "automatic-thought", type: "question", source: [511, 528], marker: "At that exact moment", outputFields: ["automaticThought"], validation: { kind: "text" } },
          { slug: "emotion-to-thought-redirect", type: "clarification", source: [511, 528], marker: "When you feel overwhelmed", activationCondition: { field: "automaticThoughtReportedAsFeeling", operator: "equals", value: true }, outputFields: ["automaticThought"] },
        ],
      },
      {
        slug: "factual-thought-meaning",
        title: "Q2a - Factual Automatic Thought Follow-up",
        type: "condition",
        source: [511, 528],
        requiredFields: ["workingAutomaticThought", "factualThoughtConfirmed"],
        nextSlug: "q2b-at-belief",
        restrictions: [sourceText([511, 528])],
        prompts: [
          { slug: "factual-thought-meaning", type: "follow_up", source: [511, 528], marker: "I can see that is true", outputFields: ["workingAutomaticThought"] },
          { slug: "confirm-working-thought", type: "confirmation", source: [511, 528], marker: "So the thought we'll be working with", outputFields: ["factualThoughtConfirmed"], validation: { kind: "boolean" } },
        ],
      },
      {
        slug: "q2b-at-belief",
        title: "Q2b - Belief in the Automatic Thought",
        type: "assessment",
        source: [529, 536],
        requiredFields: ["automaticThoughtBeliefPercent"],
        prompts: [
          { slug: "rate-at-belief", type: "rating", source: [529, 536], marker: "How much do you believe that thought", outputFields: ["automaticThoughtBeliefPercent"], validation: { kind: "rating", min: 0, max: 100 } },
        ],
      },
      {
        slug: "q3-emotion",
        title: "Q3 - Emotion and Intensity",
        type: "assessment",
        source: [537, 550],
        requiredFields: ["primaryEmotion", "primaryEmotionIntensityPercent"],
        prompts: [
          { slug: "primary-emotion", type: "question", source: [537, 550], marker: "When you have that thought", outputFields: ["primaryEmotion"] },
          { slug: "strongest-emotion", type: "clarification", source: [537, 550], marker: "Which one feels strongest", activationCondition: { field: "multipleEmotionsReported", operator: "equals", value: true }, outputFields: ["primaryEmotion"] },
          { slug: "emotion-intensity", type: "rating", source: [537, 550], marker: "How strong is that emotion", outputFields: ["primaryEmotionIntensityPercent"], validation: { kind: "rating", min: 0, max: 100 } },
        ],
      },
      {
        slug: "q4-behavior-body-summary",
        title: "Q4 - Behavior, Body, and Participant Summary",
        type: "assessment",
        source: [551, 572],
        requiredFields: ["behavior", "bodySensations", "participantSummary"],
        prompts: [
          { slug: "behavior", type: "question", source: [551, 572], marker: "What do you do when you have that thought", outputFields: ["behavior"] },
          { slug: "body-sensations", type: "question", source: [551, 572], marker: "And what do you notice in your body", outputFields: ["bodySensations"] },
          { slug: "participant-summary", type: "summary", source: [551, 572], marker: "Before we continue, could you summarize", outputFields: ["participantSummary"], validation: { kind: "participant_summary_required" } },
          { slug: "cycle-note", type: "reflection", source: [551, 572], marker: "You can see how this pattern", outputFields: ["cycleSummaryAcknowledged"] },
        ],
      },
      {
        slug: "q5-q7-behavior-and-distortion",
        title: "Q5-Q7 - Behavior Pros, Cons, and Cognitive Distortion",
        type: "question",
        source: [573, 596],
        requiredFields: ["behaviorPros", "behaviorCons", "cognitiveDistortion"],
        prompts: [
          { slug: "behavior-pros", type: "question", source: [573, 596], marker: "Are there any advantages or benefits", outputFields: ["behaviorPros"] },
          { slug: "behavior-pros-follow-up", type: "follow_up", source: [573, 596], marker: "We tend to do things for a reason", activationCondition: { field: "behaviorProsDenied", operator: "equals", value: true }, outputFields: ["behaviorPros"] },
          { slug: "behavior-cons", type: "question", source: [573, 596], marker: "And what are the disadvantages", outputFields: ["behaviorCons"] },
          { slug: "cognitive-distortion", type: "question", source: [573, 596], marker: "Looking at your automatic thought", outputFields: ["cognitiveDistortion"] },
        ],
      },
      {
        slug: "q8-q9-evidence",
        title: "Q8-Q9 - Evidence Examination",
        type: "question",
        source: [597, 616],
        requiredFields: ["evidenceFor", "evidenceAgainst"],
        restrictions: [sourceText([597, 616])],
        prompts: [
          { slug: "evidence-for", type: "question", source: [597, 616], marker: "Is there any evidence that supports", outputFields: ["evidenceFor"], validation: { kind: "array", minItems: 2, maxItems: 3, promptOnceIfSingle: true } },
          { slug: "evidence-for-more", type: "follow_up", source: [597, 616], marker: "Can you think of one or two more", activationCondition: { field: "evidenceForCount", operator: "less_than", value: 2 }, outputFields: ["evidenceFor"] },
          { slug: "evidence-against", type: "question", source: [597, 616], marker: "Now, on the other side", outputFields: ["evidenceAgainst"], validation: { kind: "array", minItems: 2, maxItems: 3, promptOnceIfSingle: true } },
          { slug: "evidence-against-direction", type: "follow_up", source: [597, 616], marker: "Think about recent days or weeks", activationCondition: { field: "evidenceAgainstCount", operator: "less_than", value: 2 }, outputFields: ["evidenceAgainst"] },
        ],
      },
      {
        slug: "q10-conclusion",
        title: "Q10 - Balanced Conclusion",
        type: "question",
        source: [617, 634],
        requiredFields: ["balancedConclusion", "conclusionTherefore", "conclusionBeliefPercent"],
        restrictions: [sourceText([617, 634])],
        prompts: [
          { slug: "balanced-conclusion", type: "question", source: [617, 634], marker: "Taking all of this evidence together", outputFields: ["balancedConclusion"] },
          { slug: "therefore-extension", type: "follow_up", source: [617, 634], marker: "Can you take that further", outputFields: ["conclusionTherefore"] },
          { slug: "full-conclusion-readback", type: "confirmation", source: [617, 634], marker: "So your conclusion is", outputFields: ["conclusionReadBackComplete"] },
          { slug: "conclusion-belief", type: "rating", source: [617, 634], marker: "How much do you believe that entire conclusion", outputFields: ["conclusionBeliefPercent"], validation: { kind: "rating", min: 0, max: 100, requiresField: "conclusionReadBackComplete" } },
        ],
      },
      {
        slug: "q11-new-emotions",
        title: "Q11 - New Emotions",
        type: "assessment",
        source: [635, 658],
        requiredFields: ["positiveEmotions", "originalEmotionRerating", "newEmotionIntensities"],
        restrictions: [sourceText([635, 658])],
        prompts: [
          { slug: "positive-emotions-first", type: "question", source: [635, 658], marker: "Now that you have reached this conclusion", outputFields: ["positiveEmotions"] },
          { slug: "original-negative-emotion", type: "question", source: [635, 658], marker: "And what about [emotion named at Q3a]", outputFields: ["originalEmotionRerating"], validation: { kind: "same_field_reference", field: "primaryEmotion" } },
          { slug: "emotion-intensities", type: "rating", source: [635, 658], outputFields: ["newEmotionIntensities"], validation: { kind: "rating", min: 0, max: 100, allowedEmotionSources: ["positiveEmotions", "primaryEmotion"] } },
        ],
      },
      {
        slug: "q12-q14-final-evaluation",
        title: "Q12-Q14 - Intended Action and Final Evaluation",
        type: "assessment",
        source: [659, 686],
        requiredFields: ["intendedActions", "newBodySensations", "revisedAutomaticThoughtBeliefPercent", "globalEvaluation"],
        prompts: [
          { slug: "intended-action", type: "question", source: [659, 686], marker: "What do you intend to do now", outputFields: ["intendedActions"] },
          { slug: "action-plan-bridge", type: "transition", source: [659, 686], marker: "Those sound like the beginning", activationCondition: { field: "intendedActions", operator: "exists" } },
          { slug: "new-body-sensations", type: "question", source: [659, 686], marker: "What do you notice in your body now", outputFields: ["newBodySensations"] },
          { slug: "repeat-exact-at", type: "rating", source: [659, 686], marker: "How much do you now believe the original automatic thought", outputFields: ["revisedAutomaticThoughtBeliefPercent"], validation: { kind: "rating", min: 0, max: 100, repeatExactField: "automaticThought" } },
          { slug: "global-evaluation", type: "question", source: [659, 686], marker: "And overall, how are you now", outputFields: ["globalEvaluation"], validation: { kind: "enum", values: ["same", "a little better", "much better"] } },
        ],
      },
      {
        slug: "closing",
        title: "Closing the Session",
        type: "session_complete",
        source: [687, 698],
        restrictions: [sourceText([699, 724])],
        terminal: true,
        prompts: [
          { slug: "closing-review", type: "closing", source: [687, 698], marker: "You did important work today", outputFields: ["closingReview"] },
          { slug: "action-plan-offer", type: "transition", source: [687, 698], marker: "If you'd like, we can also", outputFields: ["actionPlanOffer"], completionEffect: { type: "complete_session" } },
        ],
      },
      {
        slug: "safety-pause",
        title: "Safety Pause and Escalation",
        type: "clinician_escalation",
        source: [455, 470],
        safetyRuleIds: ["TBCT-S03-CRISIS-PAUSE"],
        terminal: true,
        prompts: [
          { slug: "pause-and-escalate", type: "instruction", source: [455, 470], outputFields: ["safetyEscalation"], completionEffect: { type: "pause_session" }, safetyRuleIds: ["TBCT-S03-CRISIS-PAUSE"] },
        ],
      },
    ],
    extraEdges: [
      { sourceSlug: "safety-check", targetSlug: "safety-pause", edgeType: "safety", source: [455, 470], label: "Crisis signal", condition: { field: "crisisSignal", operator: "equals", value: true }, priority: 1 },
      { sourceSlug: "q2-automatic-thought", targetSlug: "factual-thought-meaning", edgeType: "conditional", source: [511, 528], label: "Factual thought", condition: { field: "automaticThoughtIsFactual", operator: "equals", value: true }, priority: 1 },
    ],
  },
  {
    metadata: SESSION_SOURCE_METADATA[4],
    nodes: [
      {
        slug: "situation",
        title: "Step 1 - Interpersonal Situation",
        type: "session_start",
        source: [746, 762],
        requiredFields: ["interpersonalSituation"],
        safetyRuleIds: ["TBCT-S04-CRISIS-SUSPEND"],
        prompts: [
          { slug: "describe-situation", type: "question", source: [746, 762], marker: "What is happening", patientText: "What is happening in the interpersonal situation you would like to examine?", outputFields: ["interpersonalSituation"] },
        ],
      },
      {
        slug: "pathway-determination",
        title: "Pathway Determination",
        type: "condition",
        source: [763, 769],
        requiredFields: ["interpersonalPathway"],
        nextSlug: "patient-thought-belief",
        restrictions: [sourceText([763, 769])],
        prompts: [
          { slug: "recognize-pathway", type: "instruction", source: [763, 769], patientText: "We will map your perspective and the other person's possible perspective, without assuming that either interpretation is certain.", outputFields: ["interpersonalPathway"], validation: { kind: "enum", values: ["standard_conflict", "social_anxiety_feared_evaluation"] } },
        ],
      },
      {
        slug: "patient-thought-belief",
        title: "Step 2 - Patient Automatic Thought and Belief",
        type: "assessment",
        source: [746, 762],
        requiredFields: ["patientAutomaticThought", "patientAutomaticThoughtBeliefPercent"],
        prompts: [
          { slug: "patient-automatic-thought", type: "question", source: [746, 762], marker: "What is going through your mind", patientText: "What is going through your mind in that situation?", outputFields: ["patientAutomaticThought"] },
          { slug: "patient-thought-belief", type: "rating", source: [746, 762], marker: "How much do you believe that thought", patientText: "From 0 to 100%, how much do you believe that thought?", outputFields: ["patientAutomaticThoughtBeliefPercent"], validation: { kind: "rating", min: 0, max: 100 } },
        ],
      },
      {
        slug: "patient-emotion",
        title: "Step 3 - Patient Emotion and Intensity",
        type: "assessment",
        source: [746, 762],
        requiredFields: ["patientEmotion", "patientEmotionIntensityPercent"],
        prompts: [
          { slug: "patient-emotion", type: "question", source: [746, 762], marker: "Believing that, what do you feel", patientText: "When you believe that thought, what emotion do you feel?", outputFields: ["patientEmotion"] },
          { slug: "patient-emotion-intensity", type: "rating", source: [746, 762], marker: "How strong is that feeling", patientText: "From 0 to 100%, how strong is that emotion?", outputFields: ["patientEmotionIntensityPercent"], validation: { kind: "rating", min: 0, max: 100 } },
        ],
      },
      {
        slug: "patient-behavior-body",
        title: "Step 4 - Patient Behavior and Body",
        type: "assessment",
        source: [746, 762],
        requiredFields: ["patientBehavior", "patientBodySensations", "interpersonalSummaryConfirmed"],
        prompts: [
          { slug: "patient-behavior", type: "question", source: [746, 762], marker: "What do you do when you believe", patientText: "What do you do when you believe that thought and feel that emotion?", outputFields: ["patientBehavior"] },
          { slug: "patient-body", type: "question", source: [746, 762], marker: "Do you notice anything in your body", patientText: "Do you notice anything happening in your body in that moment?", outputFields: ["patientBodySensations"] },
          { slug: "confirm-summary", type: "confirmation", source: [746, 762], patientText: "Does that summary of your thought, emotion, behavior, and body response fit your experience?", outputFields: ["interpersonalSummaryConfirmed"], validation: { kind: "summary_confirmation" } },
        ],
      },
      {
        slug: "other-thought",
        title: "Step 5 - Other Person's Automatic Thought",
        type: "question",
        source: [746, 769],
        requiredFields: ["otherPersonLikelyThought"],
        prompts: [
          { slug: "other-person-thought", type: "question", source: [746, 769], marker: "What might be going through the other person's mind", outputFields: ["otherPersonLikelyThought"] },
          { slug: "plausible-possibility", type: "clarification", source: [746, 803], marker: "not expected to read the other person's mind", activationCondition: { field: "interpersonalPathway", operator: "equals", value: "social_anxiety_feared_evaluation" } },
        ],
      },
      {
        slug: "other-emotion",
        title: "Step 6 - Other Person's Emotion",
        type: "question",
        source: [746, 762],
        requiredFields: ["otherPersonLikelyEmotion"],
        prompts: [
          { slug: "other-person-emotion", type: "question", source: [746, 762], marker: "What might they feel", outputFields: ["otherPersonLikelyEmotion"] },
        ],
      },
      {
        slug: "other-behavior",
        title: "Step 7 - Other Person's Behavior",
        type: "question",
        source: [746, 762],
        requiredFields: ["otherPersonLikelyBehavior"],
        prompts: [
          { slug: "other-person-behavior", type: "question", source: [746, 762], marker: "And what might they do", outputFields: ["otherPersonLikelyBehavior"] },
        ],
      },
      {
        slug: "feedback-loop",
        title: "Feedback Loop Discovery",
        type: "dialogue",
        source: [770, 771],
        requiredFields: ["feedbackLoopRecognition"],
        restrictions: [sourceText([770, 771])],
        prompts: [
          { slug: "notice-cycle", type: "question", source: [770, 771], marker: "What do you notice about this cycle", outputFields: ["feedbackLoopRecognition"] },
          { slug: "behavior-influences-response", type: "question", source: [770, 771], marker: "How does your behavior influence", outputFields: ["feedbackLoopRecognition"] },
          { slug: "response-influences-participant", type: "question", source: [770, 771], marker: "How does their response", outputFields: ["feedbackLoopRecognition"] },
          { slug: "cycle-self-perpetuation", type: "question", source: [770, 771], marker: "How might this cycle keep", outputFields: ["feedbackLoopRecognition"], validation: { kind: "recognition_required" } },
        ],
      },
      {
        slug: "locus-of-control",
        title: "Locus of Control",
        type: "dialogue",
        source: [772, 777],
        requiredFields: ["locusOfControlRecognition"],
        restrictions: [sourceText([772, 777])],
        prompts: [
          { slug: "outside-control", type: "question", source: [772, 777], marker: "Which parts of this cycle are outside", outputFields: ["outsideControl"] },
          { slug: "other-person-control", type: "question", source: [772, 777], marker: "Can you control what the other person", outputFields: ["outsideControl"] },
          { slug: "own-leverage", type: "question", source: [772, 777], marker: "What part of this cycle do you have", outputFields: ["locusOfControlRecognition"], validation: { kind: "own_behavior_leverage_required" } },
        ],
      },
      {
        slug: "final-at-rerating",
        title: "Step 8 - Final Automatic Thought Re-rating",
        type: "assessment",
        source: [772, 783],
        requiredFields: ["revisedPatientAutomaticThoughtBeliefPercent"],
        prompts: [
          { slug: "final-at-belief", type: "rating", source: [772, 783], marker: "Now that you can see this cycle", outputFields: ["revisedPatientAutomaticThoughtBeliefPercent"], validation: { kind: "rating", min: 0, max: 100 } },
        ],
      },
      {
        slug: "action-plan",
        title: "Action Plan",
        type: "activity",
        source: [778, 783],
        requiredFields: ["plannedActions", "actionObstacles", "obstacleSolutions", "implementationTiming"],
        restrictions: [sourceText([778, 783])],
        prompts: [
          { slug: "own-behavior-action", type: "question", source: [778, 783], marker: "Since your own behavior", outputFields: ["plannedActions"] },
          { slug: "all-actions-first", type: "worksheet_instruction", source: [778, 783], outputFields: ["plannedActions"], validation: { kind: "all_actions_before_obstacles" } },
          { slug: "obstacles", type: "question", source: [778, 783], outputFields: ["actionObstacles"] },
          { slug: "solutions", type: "question", source: [778, 783], outputFields: ["obstacleSolutions"] },
          { slug: "implementation-timing", type: "question", source: [778, 783], outputFields: ["implementationTiming"] },
        ],
      },
      {
        slug: "final-check-in",
        title: "Final Check-in",
        type: "session_complete",
        source: [784, 803],
        safetyRuleIds: ["TBCT-S04-CRISIS-SUSPEND"],
        restrictions: [sourceText([787, 803])],
        terminal: true,
        prompts: [
          { slug: "final-belief-check", type: "rating", source: [784, 786], outputFields: ["revisedPatientAutomaticThoughtBeliefPercent"], validation: { kind: "rating", min: 0, max: 100 } },
          { slug: "final-emotional-check", type: "question", source: [784, 786], outputFields: ["finalEvaluation"], validation: { kind: "enum", values: ["same", "a little better", "much better"] }, completionEffect: { type: "complete_session" } },
        ],
      },
      {
        slug: "social-anxiety-guidance",
        title: "Social Anxiety / Feared-Evaluation Guidance",
        type: "condition",
        source: [763, 769],
        nextSlug: "patient-thought-belief",
        restrictions: [sourceText([763, 769])],
        prompts: [
          { slug: "test-feared-prediction", type: "instruction", source: [763, 769], outputFields: ["fearedPredictionTestPlan"] },
        ],
      },
    ],
    extraEdges: [
      { sourceSlug: "pathway-determination", targetSlug: "social-anxiety-guidance", edgeType: "conditional", source: [763, 769], label: "Social anxiety / feared evaluation", condition: { field: "interpersonalPathway", operator: "equals", value: "social_anxiety_feared_evaluation" }, priority: 1 },
    ],
  },
];

const SESSION_05_TO_06_SPECS: SessionSpec[] = [
  {
    metadata: SESSION_SOURCE_METADATA[5],
    nodes: [
      {
        slug: "baseline-guilt-shame",
        title: "Step 1 - Baseline Guilt and Shame",
        type: "session_start",
        source: [828, 831],
        requiredFields: ["guiltBeliefBaseline", "shameIntensityBaseline", "shameBaselineRecorded"],
        safetyRuleIds: ["TBCT-S05-CRISIS-PAUSE"],
        restrictions: [sourceText([819, 826])],
        prompts: [
          { slug: "guilt-belief-baseline", type: "rating", source: [828, 831], marker: "On a scale of 0 to 100%", outputFields: ["guiltBeliefBaseline"], validation: { kind: "rating", min: 0, max: 100, register: "cognitive_belief" } },
          { slug: "shame-intensity-baseline", type: "rating", source: [828, 831], marker: "What's the size of this emotion", outputFields: ["shameIntensityBaseline", "shameBaselineRecorded"], validation: { kind: "rating_or_absent", min: 0, max: 100, register: "emotional_intensity" } },
        ],
      },
      {
        slug: "language-substitution",
        title: "Step 2 - Language Substitution",
        type: "orientation",
        source: [832, 834],
        requiredFields: ["participationLanguageAccepted"],
        restrictions: [sourceText([819, 826])],
        prompts: [
          { slug: "participation-language", type: "explanation", source: [832, 834], marker: "I'm not asking about guilt or blame", outputFields: ["participationLanguageAccepted"], validation: { kind: "boolean" } },
        ],
      },
      {
        slug: "populate-grid",
        title: "Step 3 - Populate the Grid",
        type: "question",
        source: [835, 838],
        requiredFields: ["contributors"],
        restrictions: [sourceText([835, 838])],
        prompts: [
          { slug: "list-contributors", type: "question", source: [835, 838], marker: "Name all people", outputFields: ["contributors"], validation: { kind: "array", minItems: 1, patientListedLast: true, noDeepExploration: true } },
          { slug: "participant-last", type: "instruction", source: [835, 838], marker: "We will come to yourself last", outputFields: ["contributors"], validation: { kind: "participant_last" } },
        ],
      },
      {
        slug: "first-participation-ratings",
        title: "Step 4 - First Round of Participation Ratings",
        type: "assessment",
        source: [839, 843],
        requiredFields: ["participationRatingsRound1", "participantParticipationRound1"],
        restrictions: [sourceText([839, 843])],
        prompts: [
          { slug: "rate-other-contributors", type: "rating", source: [839, 843], outputFields: ["participationRatingsRound1"], validation: { kind: "participation_percentages", min: 0, max: 100, sumTo: 100, participantLast: true } },
          { slug: "participant-remainder", type: "rating", source: [839, 843], marker: "Whatever remains after summing all others", outputFields: ["participantParticipationRound1"], validation: { kind: "computed_remainder", sumTo: 100, participantLast: true } },
          { slug: "guilt-distortion-check", type: "clarification", source: [839, 850], marker: "As you think about your own participation", activationCondition: { field: "participantRejectsRemainder", operator: "equals", value: true }, outputFields: ["participationRatingsRound1"] },
        ],
      },
      {
        slug: "socratic-deepening",
        title: "Step 5 - Socratic Deepening",
        type: "dialogue",
        source: [844, 850],
        requiredFields: ["contributorExploration"],
        restrictions: [sourceText([844, 850])],
        prompts: [
          { slug: "deepen-each-contributor", type: "question", source: [844, 847], marker: "Before we move to the next evaluation", outputFields: ["contributorExploration"], validation: { kind: "no_new_numbers_during_exploration" } },
          { slug: "new-contributor-next-round", type: "instruction", source: [839, 850], outputFields: ["deferredContributors"], validation: { kind: "defer_new_contributor_to_next_round" } },
        ],
      },
      {
        slug: "rerating-rounds",
        title: "Step 6 - Second Through Fifth Evaluations",
        type: "assessment",
        source: [851, 851],
        requiredFields: ["participationRatingRounds", "participationRatingStable"],
        restrictions: [sourceText([851, 851])],
        prompts: [
          // "Continue until the patient's own percentage stabilizes...
          // most frequently three rounds total (including the first)"
          // (tbct-source-text.generated.ts:854). Implemented as a bounded
          // repeat_until covering rounds 2-3 (the manual's own most-common
          // case) entirely within this one node/turn cycle -- deliberately
          // NOT a dynamic stability-driven loop re-entering this node
          // multiple times, which would need a node-graph self-loop; that
          // mechanism is untested elsewhere in this catalog and re-entering
          // a node doesn't reset its own per-node prompt-completion
          // tracking, so a self-loop here can cascade through several
          // "already complete" re-entries within a single turn with no
          // patient input in between. A future pass that also fixes that
          // re-entry behavior could extend this to the full 4/5-round case.
          {
            slug: "updated-percentage",
            type: "rating",
            source: [851, 851],
            marker: "Updated percentage",
            outputFields: ["participationRatingRounds"],
            validation: { kind: "participation_percentages", min: 0, max: 100, sumTo: 100, showPreviousOnly: true, maximumRounds: 5 },
            executionMode: "repeat_until",
            maxIterations: 42,
            completionCondition: { kind: "field", field: "participationReratingComplete", operator: "equals", value: true },
          },
          { slug: "reflect-without-interpretation", type: "reflection", source: [851, 851], marker: "How does that feel", patientText: "How does that feel to you now?", outputFields: ["participationRatingStable"] },
        ],
      },
      {
        slug: "guilt-shame-rerating",
        title: "Step 7 - Guilt and Shame Re-rating",
        type: "assessment",
        source: [852, 859],
        requiredFields: ["guiltBeliefFinal", "shameIntensityFinal"],
        restrictions: [sourceText([819, 826])],
        prompts: [
          { slug: "guilt-belief-final", type: "rating", source: [852, 859], marker: "How much do you now believe", outputFields: ["guiltBeliefFinal"], validation: { kind: "rating", min: 0, max: 100, register: "cognitive_belief" } },
          { slug: "shame-intensity-final", type: "rating", source: [852, 859], marker: "What's the size of this emotion", activationCondition: { field: "shameBaselineRecorded", operator: "equals", value: true }, outputFields: ["shameIntensityFinal"], validation: { kind: "rating", min: 0, max: 100, register: "emotional_intensity" } },
        ],
      },
      {
        slug: "values",
        title: "Step 8 - Values",
        type: "reflection",
        source: [860, 862],
        requiredFields: ["valuesArticulated"],
        nextSlug: "summary-table",
        restrictions: [sourceText([860, 862])],
        prompts: [
          { slug: "values", type: "question", source: [860, 862], marker: "As you think about what matters most", outputFields: ["valuesArticulated"], validation: { kind: "array", minItems: 1, forbiddenTerms: ["responsibility", "responsible"] } },
        ],
      },
      {
        slug: "residual-shame",
        title: "Step 9 - Downward Arrow on Residual Shame",
        type: "question",
        source: [863, 868],
        requiredFields: ["residualShameBelief"],
        nextSlug: "summary-table",
        restrictions: [sourceText([863, 868])],
        prompts: [
          { slug: "residual-shame-meaning", type: "question", source: [863, 868], marker: "When you think about [event]", outputFields: ["residualShameBelief"] },
          { slug: "residual-shame-probe", type: "follow_up", source: [863, 868], marker: "What does that mean about you", outputFields: ["residualShameBelief"] },
        ],
      },
      {
        slug: "summary-table",
        title: "Step 10 - Summary Table",
        type: "session_complete",
        source: [869, 879],
        restrictions: [sourceText([869, 879])],
        terminal: true,
        prompts: [
          { slug: "participant-summary-table", type: "worksheet_instruction", source: [869, 879], outputFields: ["summaryTable"], validation: { kind: "participation_grid_summary", contributorRows: true, guiltRegister: "cognitive_belief", shameRegister: "emotional_intensity", values: true }, completionEffect: { type: "complete_session" } },
        ],
      },
      {
        slug: "safety-pause",
        title: "Safety Pause and Clinician Review",
        type: "clinician_escalation",
        source: [915, 931],
        safetyRuleIds: ["TBCT-S05-CRISIS-PAUSE"],
        terminal: true,
        prompts: [
          { slug: "pause-grid", type: "instruction", source: [915, 931], outputFields: ["safetyEscalation"], completionEffect: { type: "pause_session" }, safetyRuleIds: ["TBCT-S05-CRISIS-PAUSE"] },
        ],
      },
    ],
    extraEdges: [
      { sourceSlug: "baseline-guilt-shame", targetSlug: "safety-pause", edgeType: "safety", source: [915, 931], label: "Crisis or destabilization", condition: { field: "crisisSignal", operator: "equals", value: true }, priority: 1 },
      { sourceSlug: "values", targetSlug: "residual-shame", edgeType: "conditional", source: [863, 868], label: "Residual shame requires follow-up", condition: { field: "residualShameRequiresDownwardArrow", operator: "equals", value: true }, priority: 1 },
    ],
  },
  {
    metadata: SESSION_SOURCE_METADATA[6],
    nodes: [
      {
        slug: "opening-language-lock",
        title: "Opening and Language Lock",
        type: "session_start",
        source: [943, 1017],
        requiredFields: ["sessionLanguage", "languageLocked"],
        safetyRuleIds: ["TBCT-S06-CRISIS-PAUSE"],
        restrictions: [sourceText([961, 989])],
        prompts: [
          { slug: "warm-opening", type: "opening", source: [943, 1017], marker: "What do you find difficult", outputFields: ["sessionLanguage", "languageLocked"], validation: { kind: "language_lock_from_first_substantive_message" } },
          { slug: "symptom-list-opening", type: "question", source: [1062, 1104], marker: "Tell me about the situations", outputFields: ["symptomItems"] },
        ],
      },
      {
        slug: "human-presence",
        title: "Human Presence and Room Safety",
        type: "dialogue",
        source: [990, 1017],
        requiredFields: ["inRoomSafetyBehaviorCheck"],
        safetyRuleIds: ["TBCT-S06-CRISIS-PAUSE"],
        restrictions: [sourceText([990, 1017])],
        prompts: [
          { slug: "notice-going-quiet", type: "clarification", source: [990, 1017], marker: "I notice you've gone quieter", activationCondition: { field: "inRoomSafetyBehaviorObserved", operator: "equals", value: true }, outputFields: ["inRoomSafetyBehaviorCheck"] },
          { slug: "check-going-quiet", type: "question", source: [990, 1017], marker: "Going quiet is on your list", activationCondition: { field: "inRoomSafetyBehaviorObserved", operator: "equals", value: true }, outputFields: ["inRoomSafetyBehaviorCheck"] },
        ],
      },
      {
        slug: "symptom-list",
        title: "Step 1 - Symptom List and Item Expansion",
        type: "question",
        source: [1062, 1104],
        requiredFields: ["symptomItems"],
        restrictions: [sourceText([1062, 1104])],
        prompts: [
          { slug: "concrete-actions", type: "question", source: [1062, 1104], marker: "Tell me about the situations", outputFields: ["symptomItems"], validation: { kind: "array", minItems: 4, maxItems: 21, exactParticipantWords: true } },
          { slug: "modifier-decomposition", type: "clarification", source: [1062, 1104], marker: "Is [core situation] harder", outputFields: ["symptomItems"], validation: { kind: "granular_modifier_decomposition", noCollapsedCategories: true } },
          { slug: "close-list", type: "confirmation", source: [1062, 1104], outputFields: ["symptomItems"], validation: { kind: "modifier_walk_complete", recommendedMinItems: 6 } },
        ],
      },
      {
        slug: "color-scale-and-calibration",
        title: "Step 2 - Color Scale and Calibration",
        type: "assessment",
        source: [1105, 1123],
        requiredFields: ["colorScalePresented", "calibrationScore"],
        restrictions: [sourceText([1105, 1123])],
        prompts: [
          { slug: "six-anchor-symptom-scale", type: "instruction", source: [1105, 1123], marker: "Comfortable or indifferent exposure", outputFields: ["colorScalePresented"], validation: { kind: "exact_scale_anchors", min: 0, max: 5, colors: ["light blue", "blue", "green", "green", "yellow", "red"] } },
          // The manual's "establish 0-1" (tbct-source-text.generated.ts:1115) describes the
          // EXPECTED result of scoring a benign in-session anchor ("talking with me during
          // this session"), not a hard input bound -- the calibration anchor uses the same
          // 0-5 color scale as every other item (six-anchor-symptom-scale above, and
          // item-score below). Encoding {max:1} here rejected any real 2-5 answer and
          // deadlocked the session after 3 clarification attempts.
          { slug: "calibration-anchor", type: "rating", source: [1105, 1123], marker: "First, let's calibrate", outputFields: ["calibrationScore"], validation: { kind: "rating", min: 0, max: 5, collectedBeforeItemScores: true } },
          { slug: "color-zone-rules", type: "explanation", source: [1105, 1123], outputFields: ["colorZoneRulesAcknowledged"], validation: { kind: "green_yellow_red_rules_presented" } },
        ],
      },
      {
        slug: "rate-items",
        title: "Step 2 - Rate Each Symptom Item",
        type: "assessment",
        source: [1105, 1123],
        requiredFields: ["symptomItemScores"],
        restrictions: [sourceText([1105, 1123])],
        prompts: [
          {
            slug: "item-score",
            type: "rating",
            source: [1105, 1123],
            patientText: "In your own words, [item] — using our 0 to 5 color scale, how would you rate it?",
            outputFields: ["symptomItemScores"],
            validation: { kind: "hierarchy_item_score", min: 0, max: 5, exactParticipantWords: true, noRescoreExistingItem: true },
            // Re-asks this same prompt once per listed symptom item instead of
            // stopping after a single score, so every item gets its own rating.
            executionMode: "repeat_until",
            maxIterations: 21,
            completionCondition: { kind: "field", field: "allSymptomItemsRated", operator: "equals", value: true },
          },
        ],
      },
      {
        slug: "discomfort-distress",
        title: "Step 3 - Discomfort and Distress",
        type: "dialogue",
        source: [1124, 1138],
        requiredFields: ["discomfortDistressSummary"],
        restrictions: [sourceText([1124, 1138])],
        prompts: [
          { slug: "value-linked-discomfort", type: "question", source: [1124, 1138], marker: "Why do you go to work", outputFields: ["discomfortDistressSummary"] },
          { slug: "professional-effort", type: "question", source: [1124, 1138], marker: "Why do people study for years", outputFields: ["discomfortDistressSummary"] },
          { slug: "participant-capsule-summary", type: "summary", source: [1124, 1138], marker: "How would you explain the difference", outputFields: ["discomfortDistressSummary"], validation: { kind: "participant_summary_required" } },
        ],
      },
      {
        slug: "green-commitments",
        title: "Step 4 - Green Commitments",
        type: "homework",
        source: [1139, 1151],
        requiredFields: ["greenHomeworkItems", "accountabilityPartner", "fallbackPlan"],
        safetyRuleIds: ["TBCT-S06-NO-YELLOW-RED-HOMEWORK"],
        restrictions: [sourceText([1139, 1151])],
        prompts: [
          { slug: "choose-green-items", type: "question", source: [1139, 1151], marker: "Let's pick 2", outputFields: ["greenHomeworkItems"], validation: { kind: "green_homework_selection", minItems: 2, maxItems: 3, allowedScores: [2, 3], participantChooses: true } },
          { slug: "accountability-partner", type: "question", source: [1139, 1151], marker: "Who in your life", outputFields: ["accountabilityPartner"] },
          { slug: "plan-b", type: "question", source: [1139, 1151], marker: "And if that doesn't happen", outputFields: ["fallbackPlan"] },
        ],
      },
      {
        slug: "exposure-principles",
        title: "Step 5 - Exposure Principles",
        type: "orientation",
        source: [1152, 1171],
        requiredFields: ["exposurePrinciplesAcknowledged"],
        restrictions: [sourceText([1152, 1171])],
        prompts: [
          { slug: "intensity", type: "explanation", source: [1152, 1171], marker: "I will never ask you", outputFields: ["exposurePrinciplesAcknowledged"] },
          { slug: "duration", type: "explanation", source: [1152, 1171], marker: "If you stay in the situation", outputFields: ["exposurePrinciplesAcknowledged"] },
          { slug: "frequency", type: "explanation", source: [1152, 1171], marker: "One exposure is never enough", outputFields: ["exposurePrinciplesAcknowledged"] },
          { slug: "homework-confirmation", type: "confirmation", source: [1152, 1171], marker: "So the green items", outputFields: ["greenHomeworkItems"] },
        ],
      },
      {
        slug: "relief-versus-overcoming",
        title: "Step 6 - Relief Versus Overcoming",
        type: "visualization",
        source: [1172, 1183],
        requiredFields: ["reliefVersusOvercomingInsight"],
        prompts: [
          { slug: "relief-curve", type: "question", source: [1172, 1183], marker: "When you go quiet in a meeting", outputFields: ["reliefVersusOvercomingInsight"] },
          { slug: "next-meeting", type: "question", source: [1172, 1183], marker: "And the next meeting", outputFields: ["reliefVersusOvercomingInsight"] },
          { slug: "overcoming-curve", type: "explanation", source: [1172, 1183], marker: "Anxiety rises", outputFields: ["reliefVersusOvercomingInsight"] },
        ],
      },
      {
        slug: "circuit-two",
        title: "Step 7 - Circuit 2 and Underlying Assumption",
        type: "activity",
        source: [1184, 1206],
        requiredFields: ["safetyBehaviors", "underlyingAssumption", "circuitTwo", "circuitTwoSummary"],
        restrictions: [sourceText([1184, 1206])],
        prompts: [
          // "question", not "explanation": the curated text for this prompt
          // ends by asking "What safety behavior do you notice?" -- an
          // "explanation" type prompt completes on delivery regardless of
          // patient input, so safetyBehaviors was structurally guaranteed to
          // stay empty.
          { slug: "introduce-safety-behaviors", type: "question", source: [1184, 1206], marker: "There are behaviors you repeat", outputFields: ["safetyBehaviors"] },
          { slug: "patient-formulates-ua", type: "question", source: [1184, 1206], marker: "Because if you", outputFields: ["underlyingAssumption"], validation: { kind: "participant_formulated_conditional", requiredPattern: "if_then", level: 2, noCoreBelief: true } },
          { slug: "render-circuit-two", type: "worksheet_instruction", source: [1184, 1206], marker: "Underlying Assumption", outputFields: ["circuitTwo"], validation: { kind: "exact_circuit_structure" } },
          { slug: "place-on-diagram", type: "question", source: [1184, 1206], marker: "Where would you put that sentence", outputFields: ["circuitTwo"] },
          { slug: "circuit-two-summary", type: "summary", source: [1184, 1206], outputFields: ["circuitTwoSummary"], validation: { kind: "participant_summary_required" } },
        ],
      },
      {
        slug: "review-required-closing",
        title: "Interaction Rules, Failure Modes, and Closing",
        type: "session_complete",
        source: [1207, 1275],
        safetyRuleIds: ["TBCT-S06-CRISIS-PAUSE", "TBCT-S06-NO-YELLOW-RED-HOMEWORK"],
        restrictions: [sourceText([1207, 1275])],
        terminal: true,
        prompts: [
          { slug: "session-worksheet", type: "worksheet_instruction", source: [1207, 1275], outputFields: ["ccshWorksheet"], validation: { kind: "ccsh_summary", includeItems: true, includeHomework: true, includeCircuitTwo: true }, completionEffect: { type: "complete_session" } },
        ],
      },
      {
        slug: "yellow-red-homework-block",
        title: "Yellow and Red Homework Block",
        type: "condition",
        source: [1139, 1151],
        nextSlug: "green-commitments",
        safetyRuleIds: ["TBCT-S06-NO-YELLOW-RED-HOMEWORK"],
        restrictions: [sourceText([1139, 1151])],
        prompts: [
          { slug: "block-independent-homework", type: "instruction", source: [1139, 1151], outputFields: ["homeworkSelectionCorrection"], validation: { kind: "reject_non_green_homework" }, safetyRuleIds: ["TBCT-S06-NO-YELLOW-RED-HOMEWORK"] },
        ],
      },
      {
        slug: "safety-pause",
        title: "Safety Pause and Clinician Review",
        type: "clinician_escalation",
        source: [990, 1017],
        safetyRuleIds: ["TBCT-S06-CRISIS-PAUSE"],
        terminal: true,
        prompts: [
          { slug: "pause-hierarchy", type: "instruction", source: [990, 1017], outputFields: ["safetyEscalation"], completionEffect: { type: "pause_session" }, safetyRuleIds: ["TBCT-S06-CRISIS-PAUSE"] },
        ],
      },
    ],
    extraEdges: [
      { sourceSlug: "opening-language-lock", targetSlug: "safety-pause", edgeType: "safety", source: [990, 1017], label: "Crisis signal", condition: { field: "crisisSignal", operator: "equals", value: true }, priority: 1 },
      { sourceSlug: "green-commitments", targetSlug: "yellow-red-homework-block", edgeType: "safety", source: [1139, 1151], label: "Yellow or red item proposed for independent homework", condition: { field: "currentHomeworkItemColor", operator: "in", value: ["yellow", "red"] }, priority: 1 },
    ],
  },
];

const SESSION_07_TO_08_SPECS: SessionSpec[] = [
  {
    metadata: SESSION_SOURCE_METADATA[7],
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
  },
  {
    metadata: SESSION_SOURCE_METADATA[8],
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
  },
];

const SESSION_SPECS: SessionSpec[] = [...SESSION_01_TO_04_SPECS, ...SESSION_05_TO_06_SPECS, ...SESSION_07_TO_08_SPECS];

export const CANONICAL_SOURCE_SEEDS = SESSION_SPECS.map(buildSessionSeed);
export const CANONICAL_SESSION_DEFINITIONS = CANONICAL_SOURCE_SEEDS.map((seed) => seed.definition);
export const CANONICAL_SESSION_COMMON_RULES = Object.fromEntries(CANONICAL_SOURCE_SEEDS.map((seed) => [seed.definition.id, seed.commonRules])) as Record<string, SessionCommonRules>;
export const CANONICAL_STAGE_NODES = CANONICAL_SOURCE_SEEDS.flatMap((seed) => seed.nodes);
export const CANONICAL_PROMPT_ITEMS = CANONICAL_SOURCE_SEEDS.flatMap((seed) => seed.promptItems);
export const CANONICAL_SOURCE_EDGES = CANONICAL_SOURCE_SEEDS.flatMap((seed) => seed.edges);

export const CANONICAL_SESSION_PLAN: SessionPlan = {
  id: "tbct-source-fidelity-plan",
  protocolId: CANONICAL_PROTOCOL_ID,
  orderedEntries: CANONICAL_SESSION_DEFINITIONS.map((definition) => ({
    entryId: `${definition.id}-entry`,
    sessionId: definition.id,
    order: definition.number,
    active: true,
    occurrence: 1,
    label: `Session ${String(definition.number).padStart(2, "0")}`,
  })),
  startingEntryId: "tbct-s01-entry",
  status: "validated",
  version: CANONICAL_SOURCE_VERSION,
  createdAt: CATALOG_TIMESTAMP,
  updatedAt: CATALOG_TIMESTAMP,
};

const SESSION_ID_ALIASES = Object.fromEntries(
  Object.values(SESSION_SOURCE_METADATA).flatMap((metadata) => {
    const number = String(metadata.number).padStart(2, "0");
    return [
      [metadata.id, metadata.id],
      [`tbct-session-${number}`, metadata.id],
      [`tbct-br-001-session-${number}`, metadata.id],
      [`SESSION-${number}`, metadata.id],
      [`session-${number}`, metadata.id],
    ];
  }),
) as Record<string, string>;

export function resolveCanonicalSessionId(sessionId?: string) {
  if (!sessionId) return undefined;
  return SESSION_ID_ALIASES[sessionId] ?? SESSION_ID_ALIASES[sessionId.toLowerCase()];
}

export function getCanonicalSessionSeed(sessionId: string) {
  const canonicalSessionId = resolveCanonicalSessionId(sessionId) ?? sessionId;
  return CANONICAL_SOURCE_SEEDS.find((seed) => seed.definition.id === canonicalSessionId) ?? null;
}

export function getCanonicalSourceFidelityIssues() {
  const issues: string[] = [];
  if (CANONICAL_SOURCE_SEEDS.length !== 8) issues.push(`Expected 8 source sessions, found ${CANONICAL_SOURCE_SEEDS.length}.`);
  for (const seed of CANONICAL_SOURCE_SEEDS) {
    if (seed.definition.protocolId !== CANONICAL_PROTOCOL_ID) issues.push(`${seed.definition.id} has a non-canonical protocol ID.`);
    if (seed.nodes.length === 0 || seed.promptItems.length === 0) issues.push(`${seed.definition.id} is missing source-backed nodes or prompt items.`);
    for (const node of seed.nodes) {
      if (!node.sourceTrace.sourceLineStart || !node.sourceTrace.sourceLineEnd) issues.push(`${node.id} is missing an exact source range.`);
      for (const promptItemId of node.promptItemIds) {
        if (!seed.promptItems.some((promptItem) => promptItem.id === promptItemId)) issues.push(`${node.id} refers to missing prompt ${promptItemId}.`);
      }
    }
    for (const promptItem of seed.promptItems) {
      if (promptItem.origin !== "source_imported") issues.push(`${promptItem.id} is not source imported.`);
      if (!promptItem.verbatimText.trim()) issues.push(`${promptItem.id} has no source text.`);
      if (promptItem.sourceHash !== TBCT_SOURCE_TEXT_HASH) issues.push(`${promptItem.id} has a stale source hash.`);
    }
  }
  return issues;
}
