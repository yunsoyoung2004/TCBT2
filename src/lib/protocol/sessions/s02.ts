import { sourceText } from "@/lib/protocol/source-fidelity-catalog";
import type { SessionSourceMetadata, SessionSpec } from "@/lib/protocol/source-fidelity-catalog";

const metadata: SessionSourceMetadata = {
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
};

export const spec: SessionSpec = {
  metadata,
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
};
