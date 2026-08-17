import { sourceText } from "@/lib/protocol/source-fidelity-catalog";
import type { SessionSourceMetadata, SessionSpec } from "@/lib/protocol/source-fidelity-catalog";

const metadata: SessionSourceMetadata = {
  number: 1,
  id: "tbct-s01",
  title: "Introduction to the TBCT Model",
  titleKo: "TBCT 모델 소개",
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
};

export const spec: SessionSpec = {
  metadata,
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
};
