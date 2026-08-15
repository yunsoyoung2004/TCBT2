import { sourceText } from "@/lib/protocol/source-fidelity-catalog";
import type { SessionSourceMetadata, SessionSpec } from "@/lib/protocol/source-fidelity-catalog";

const metadata: SessionSourceMetadata = {
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
        // §4.7 [신규 B-8]: source frames this as "here and now we are
        // experiencing a situation" -- a Socratic check using the current
        // session moment as material, not a collection point for the
        // participant's own life situation (that comes later, after the
        // three-person example, per the S01 manual). situationThoughtDistinction
        // is a learning-check field only; do not bind a participant's
        // personal situation to it (worksheet binding fix is Phase 2).
        { slug: "telegraphic-situation", type: "question", source: [66, 74], marker: "How would you describe what is happening right now", patientText: "How would you describe what is happening right now, quite telegraphically?", outputFields: ["situationThoughtDistinction"], validation: { kind: "participant_articulated_distinction" } },
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
        // 세션로그 §9-1 [P1] 잔여 커버리지: verbatim 복원.
        { slug: "situation-or-thought", type: "clarification", source: [66, 74], marker: "That's interesting", patientText: "That's interesting — is that the situation, or could that be a thought?" },
        { slug: "personal-example-redirect", type: "transition", source: [73, 74], marker: "That's a great example", patientText: "That's a great example — let's hold on to it for a moment. We will come back to your personal example in a minute. But before we come back to your situation, I'd like to show you something that will make it even clearer. Would that be okay? Can you give me just a few minutes?", completionEffect: { type: "redirect_to_three_person_example" } },
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
        {
          // §4.5, Appendix A-4: rationale restored from the S01 manual
          // ("Why start with strangers, not you?") rather than left to the
          // generic fallback -- this is a direct paraphrase-restore, not new
          // clinical content.
          slug: "preview-candidates",
          type: "explanation",
          source: [75, 85],
          marker: "I'm going to walk you through three different people",
          patientText: "Before we look at your own situation, I'd like to walk you through three different people in the same interview. It's much easier to see the pattern clearly on a neutral example first — and then your own situation becomes far simpler, and less overwhelming.",
          outputFields: ["threePersonPreviewComplete"],
        },
        {
          slug: "set-up-candidates",
          type: "instruction",
          source: [82, 85],
          marker: "Let's pretend that I am not a therapist",
          // Verbatim match to tbct-source-text.generated.ts:91 -- the prior
          // text dropped "and from what I could see" from the compliment,
          // which then diverged from the identical sentence quoted at
          // generated.ts:84 for the preview step. All three prompts that
          // repeat this compliment (this one, candidate-two-same-situation,
          // candidate-three-same-situation) now share the exact same wording.
          patientText: "Let's pretend that I am not a therapist but a businessperson. I have a job opening, and I will give the same compliment to three candidates: ‘I read your résumé, and from what I could see, you seem to be a capable and competent person.’",
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
        { slug: "candidate-one-emotion", type: "question", source: [86, 92], marker: "Upon hearing this compliment", patientText: "Upon hearing this compliment, what emotion do you think this first candidate feels?", outputFields: ["candidateOneEmotion"] },
        { slug: "candidate-one-thought", type: "question", source: [86, 92], marker: "For them to feel that way", patientText: "For them to feel that way, what do you think went through their mind — what was the automatic thought?", outputFields: ["candidateOneThought"] },
        { slug: "candidate-one-behavior", type: "question", source: [86, 92], marker: "With that thought and that emotion", patientText: "With that thought and that emotion, what behavior do you think this candidate would show?", outputFields: ["candidateOneBehavior"] },
        {
          // §4.4: without this completionCondition, a missing/malformed
          // answer still marks the prompt complete (the reducer's default
          // is "complete on any input" -- see runtime-state-reducer.ts),
          // and static-messages/s01.ts's ternary used to silently treat
          // any non-"positive" value (undefined, typos, empty) as
          // "negative". Requiring a genuinely valid value here re-asks
          // instead of guessing, so an invalid/missing answer can never
          // reach candidate-one-thought-arrow with a fabricated valence.
          slug: "candidate-one-reaction",
          type: "question",
          source: [86, 92],
          marker: "Do you think the interviewer's reaction",
          patientText: "Do you think the interviewer's reaction to that behavior would be positive or negative?",
          outputFields: ["candidateOneReaction"],
          validation: { kind: "enum", values: ["positive", "negative"] },
          completionCondition: { field: "candidateOneReaction", operator: "in", value: ["positive", "negative"] },
        },
        // §4.6 [신규 N-2]: all three arrows share candidateOneReturningArrows.
        // Without validation:{kind:"array"}, the shared extraction layer
        // treats each answer as a scalar overwrite and only the last of the
        // three survives (runtime-context.ts's LIST_BUILDING_VALIDATION_KINDS
        // makes "array"/"min_items" append instead -- the same mechanism
        // problems/goals already rely on). This keeps the single field name
        // (no runtime-side rename needed) while preserving all three answers.
        { slug: "candidate-one-thought-arrow", type: "follow_up", source: [86, 92], marker: "And when the interviewer reacts positively", patientText: "And when the interviewer reacts positively, what happens to the candidate's original thought — does it get stronger, weaker, or stay the same?", outputFields: ["candidateOneReturningArrows"], validation: { kind: "array" } },
        { slug: "candidate-one-emotion-arrow", type: "follow_up", source: [86, 92], marker: "And when that thought gets stronger", patientText: "And when that thought gets stronger, what happens to the emotion?", outputFields: ["candidateOneReturningArrows"], validation: { kind: "array" } },
        { slug: "candidate-one-behavior-arrow", type: "follow_up", source: [86, 92], marker: "And when the emotion grows", patientText: "And when the emotion grows, what happens to the behavior?", outputFields: ["candidateOneReturningArrows"], validation: { kind: "array" } },
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
        {
          // Verbatim compliment restore (§Appendix A-3): the source frames
          // candidate 2's situation as "put a second person in that chair...
          // I'll say exactly the same thing to them" -- previously this
          // prompt had no patientText at all, so a marker-extraction miss
          // could drop the compliment sentence entirely.
          slug: "candidate-two-same-situation",
          type: "question",
          source: [93, 104],
          marker: "Now I'd like to put a second person",
          patientText: "Now I'd like to put a second person in that chair, and I tell them exactly the same thing: ‘I read your résumé, and from what I could see, you seem to be a capable and competent person.’",
          outputFields: ["candidateTwoSameSituation"],
        },
        { slug: "candidate-two-emotion", type: "question", source: [93, 104], marker: "Upon hearing this, do you think it's possible", patientText: "Upon hearing this, do you think it's possible that this second candidate might feel sad or discouraged?", outputFields: ["candidateTwoEmotion"], validation: { kind: "text", siblingField: "candidateOneEmotion" } },
        {
          // siblingField above only flags "did this repeat candidate 1's
          // emotion" so the recheck prompt below can trigger -- the clinical
          // task is accepting the *possibility* of a different feeling, not
          // producing a free-form emotion distinct from candidate 1's (see
          // v3 §4.3.4d). Mutually exclusive with the recheck prompt: this
          // one only fires when the participant did NOT repeat the sibling
          // emotion (i.e. they gave some other explicit refusal/doubt, e.g.
          // "I don't see why").
          slug: "candidate-two-possibility",
          type: "clarification",
          source: [93, 104],
          marker: "I'm talking about possibility",
          patientText: "I'm talking about possibility, not probability — can you imagine it being possible?",
          activationCondition: { field: "candidateTwoEmotionRepeatsSibling", operator: "not_equals", value: true },
          outputFields: ["candidateTwoPossibility"],
        },
        {
          // [교체 C-1] Was a re-ask of "what do you think this candidate
          // might feel?" -- the exact protocol violation v2 proposed and v3
          // rejects (§4.3.2): emotion is a fixed variable the guide
          // presents for candidates 2/3, not something the participant is
          // asked to generate. Replaced with a possibility-acceptance check
          // per the original three-person-example transcript ("But you can
          // imagine this possibility, can't you?"), grounded in de Oliveira,
          // "Distinctive Features" (not in tbct-source-text.generated.ts,
          // which only scripts the "I don't see why" refusal branch via
          // candidate-two-possibility above -- this repeats-sibling branch
          // has no separate verbatim script). See §부록 A-1.
          // P0-06 fix (정적분석 리포트): previously outputFields:
          // ["candidateTwoEmotion"] captured whatever free text the
          // participant gave here verbatim -- a bare "yes"/"I guess so"
          // would land in candidateTwoEmotion as literal text, even though
          // the code's own comment above already establishes the emotion is
          // a fixed value the guide presents, not something to elicit
          // freely (v3 §4.3.4d). The participant's answer here is really
          // possibility *acceptance*, not the emotion word itself -- now
          // captured into its own field, with candidateTwoEmotion set
          // deterministically via completionEffect regardless of exact
          // wording.
          slug: "candidate-two-emotion-recheck",
          type: "clarification",
          source: [93, 104],
          patientText: "That's one possibility — and it's exactly the same words the first candidate heard. But can you imagine it being possible? Can you suppose this second candidate hearing that and feeling sad or discouraged instead?",
          activationCondition: { field: "candidateTwoEmotionRepeatsSibling", operator: "equals", value: true },
          outputFields: ["candidateTwoPossibilityAccepted"],
          completionEffect: { type: "set_field", field: "candidateTwoEmotion", value: "sad or discouraged" },
        },
        { slug: "candidate-two-thought", type: "question", source: [93, 104], marker: "For them to feel sad or discouraged", patientText: "For them to feel sad or discouraged in this situation, what do you think went through their mind?", outputFields: ["candidateTwoThought"] },
        // Explicit patientText because quotedSourceText's marker-quote
        // extraction doesn't cleanly isolate this line the way it does for
        // candidate-three-behavior's near-identical sentence -- without it,
        // the generic fallback generator produced the ungrammatical
        // "With that thought and that sadness, what they would do?"
        { slug: "candidate-two-behavior", type: "question", source: [93, 104], marker: "With that thought and that sadness", patientText: "With that thought and that sadness, what behavior would you expect from this candidate?", outputFields: ["candidateTwoBehavior"] },
        {
          // §4.4 -- same fix as candidate-one-reaction above.
          slug: "candidate-two-reaction",
          type: "question",
          source: [93, 104],
          marker: "Do you think the interviewer's reaction",
          patientText: "Do you think the interviewer's reaction to that behavior would be positive or negative?",
          outputFields: ["candidateTwoReaction"],
          validation: { kind: "enum", values: ["positive", "negative"] },
          completionCondition: { field: "candidateTwoReaction", operator: "in", value: ["positive", "negative"] },
        },
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
        {
          // Verbatim compliment restore (§Appendix A-3), same rationale as
          // candidate-two-same-situation above.
          slug: "candidate-three-same-situation",
          type: "question",
          source: [105, 117],
          marker: "And here's the third and last one",
          patientText: "And here's the third and last one. Same situation, same room, same chair — and I say the same thing: ‘I read your résumé, and from what I could see, you seem to be a capable and competent person.’",
          outputFields: ["candidateThreeSameSituation"],
        },
        { slug: "candidate-three-emotion", type: "question", source: [105, 117], marker: "Do you think it's possible that this third candidate", patientText: "Do you think it's possible that this third candidate might feel irritated, or show some degree of hostility — even if disguised?", outputFields: ["candidateThreeEmotion"], validation: { kind: "text", siblingField: "candidateOneEmotion" } },
        {
          // [교체 C-1] Same fix as candidate-two-emotion-recheck above --
          // possibility acceptance, not a re-ask of emotion. See §부록 A-2.
          // P0-06 fix -- same rationale as candidate-two-emotion-recheck above.
          slug: "candidate-three-emotion-recheck",
          type: "clarification",
          source: [105, 117],
          patientText: "It's the same situation, the same room, the same words. Can you imagine or see this third candidate feeling irritated, and even getting angry?",
          activationCondition: { field: "candidateThreeEmotionRepeatsSibling", operator: "equals", value: true },
          outputFields: ["candidateThreePossibilityAccepted"],
          completionEffect: { type: "set_field", field: "candidateThreeEmotion", value: "irritated or hostile" },
        },
        { slug: "candidate-three-thought", type: "question", source: [105, 117], marker: "For them to feel irritated or hostile", patientText: "For them to feel irritated or hostile in this situation, what do you think went through their mind?", outputFields: ["candidateThreeThought"] },
        { slug: "candidate-three-behavior", type: "question", source: [105, 117], marker: "With that thought and that irritation", patientText: "With that thought and that irritation, what behavior would you expect?", outputFields: ["candidateThreeBehavior"] },
        {
          // §4.4 -- same fix as candidate-one-reaction above.
          slug: "candidate-three-reaction",
          type: "question",
          source: [105, 117],
          marker: "Do you think the interviewer's reaction",
          patientText: "Do you think the interviewer's reaction to that behavior would be positive or negative?",
          outputFields: ["candidateThreeReaction"],
          validation: { kind: "enum", values: ["positive", "negative"] },
          completionCondition: { field: "candidateThreeReaction", operator: "in", value: ["positive", "negative"] },
        },
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
        // §4.6: same shared-field append fix as the returning arrows above --
        // these two questions both write threePersonModelInsight.
        { slug: "three-person-observation", type: "question", source: [118, 129], marker: "Three different people heard exactly", patientText: "Three different people heard exactly the same compliment. What did you notice about how they thought, felt, and behaved?", outputFields: ["threePersonModelInsight"], validation: { kind: "array" } },
        { slug: "situation-thought-emotion-link", type: "question", source: [118, 129], marker: "What does that tell you", patientText: "What does that tell you about the relationship between situations, thoughts, and emotions?", outputFields: ["threePersonModelInsight"], validation: { kind: "array" } },
        { slug: "return-to-personal-example", type: "transition", source: [118, 129], marker: "Now, let's go back", patientText: "Now, let's go back to what you mentioned earlier about [their situation]. With what you've just seen, let's look at how this same pattern shows up in your own experience." },
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
        { slug: "thought-to-emotion", type: "question", source: [130, 140], marker: "When that thought gets stronger", patientText: "When that thought gets stronger, what happens to the emotion?", outputFields: ["personalThoughtEmotionLink"] },
        { slug: "emotion-to-behavior", type: "question", source: [130, 140], marker: "When the emotion grows, what happens to your behavior", patientText: "When the emotion grows, what happens to your behavior?", outputFields: ["personalEmotionBehaviorLink"] },
        { slug: "behavior-to-situation", type: "question", source: [130, 140], marker: "When you behaved that way", patientText: "When you behaved that way, what happened to the situation?", outputFields: ["personalBehaviorSituationLink"] },
        { slug: "situation-to-thought", type: "question", source: [130, 140], marker: "And when the situation didn't change", patientText: "And when the situation didn't change, what went through your mind?", outputFields: ["personalSituationThoughtLink"] },
        { slug: "outcome-gap", type: "follow_up", source: [130, 140], marker: "So what does it tell you that what you feared", patientText: "So what does it tell you that what you feared didn't actually happen?", activationCondition: { field: "fearedOutcomeDidNotMaterialize", operator: "equals", value: true }, outputFields: ["outcomeGapInsight"] },
      ],
    },
    {
      slug: "participant-summary",
      title: "Step 4 - Participant Summary",
      type: "summary",
      source: [141, 144],
      requiredFields: ["participantSummary"],
      prompts: [
        { slug: "participant-summary", type: "summary", source: [141, 144], marker: "Before we move on", patientText: "Before we move on, I'd like to ask you: in your own words, what did you notice or understand about how your thoughts, emotions, and behaviors connect in that situation?", outputFields: ["participantSummary"], validation: { kind: "participant_summary_required" } },
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
        {
          // §4.8.1: manual names the Annex location explicitly ("It's
          // included at the end of this guide, see the Annex... The AI will
          // check that you have it before that part begins"). Loops on this
          // same prompt via completionCondition until distortionListAvailable
          // is true instead of advancing on any answer and letting the step
          // run without the list -- a false answer just re-asks, with the
          // Annex pointer already in the question, so no separate gating
          // prompt (and no mid-array insertion that would shift this node's
          // later prompt IDs) is needed.
          slug: "confirm-list",
          type: "question",
          source: [145, 155],
          marker: "Do you have the cognitive distortions list",
          patientText: "Do you have your cognitive distortions list with you? It's in the Annex at the end of your session guide — if you need to grab it, that's fine, just let me know once you have it in front of you.",
          outputFields: ["distortionListAvailable"],
          validation: { kind: "boolean" },
          completionCondition: { field: "distortionListAvailable", operator: "equals", value: true },
        },
        {
          // §4.8.2 [교체 C-2]: "read two or three of these" is a reading
          // count, not a selection count (source: "Can you read two or
          // three of these?" then separately "Can you find any distortions
          // that fit..." -- often just one). Renamed away from
          // participantSelectedDistortions so this reading-confirmation step
          // can no longer force/pollute the participant's actual distortion
          // choice below.
          slug: "read-distortions",
          type: "instruction",
          source: [145, 155],
          marker: "These negative automatic thoughts",
          patientText: "These negative automatic thoughts we've been looking at — they sometimes have a name in cognitive therapy. We call them cognitive distortions. Not every automatic thought is a distortion, but some of them are errors or exaggerations in our thinking that are worth examining. Can you take a look at the list and read two or three of the distortions?",
          outputFields: ["distortionsReadAloud"],
          validation: { kind: "min_items", minItems: 2, maxItems: 3 },
        },
        // identify-distortion is now the sole producer of
        // participantSelectedDistortions, with no minItems floor -- one
        // distortion is clinically sufficient (S03 system prompt: "one is
        // usually sufficient") and the participant's own judgment decides
        // the count, per §4.8.2.
        { slug: "identify-distortion", type: "question", source: [145, 155], marker: "Looking at what went through your mind", patientText: "Looking at what went through your mind in that situation — do any of these distortions seem to fit?", outputFields: ["participantSelectedDistortions"] },
        { slug: "meaning-of-distortion", type: "question", source: [145, 155], marker: "If you discovered that this thought", patientText: "If you discovered that this thought might be a cognitive distortion — a kind of error in thinking — what difference would that make?", outputFields: ["distortionMeaning"] },
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
          // §7.3 [신규 B-7]: "your therapist" assumes a role Protocol V9
          // Arm 3 (AI-Only) participants don't have. Neutralized to match
          // the participant manual's own arm-neutral phrasing ("study
          // clinician").
          patientText: "Before our next session, please practice noticing your automatic thoughts each day with the cognitive distortions list, using its personal-examples column. In a future session, we will introduce the Intrapersonal Thought Record to help you work with these thoughts more deeply. Thank you for your work today.",
          outputFields: ["dailyObservationPractice"],
          completionEffect: { type: "complete_session" },
        },
      ],
    },
  ],
};
