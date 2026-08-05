# TBCT-S02 fidelity audit

- Release: demo-release
- Patient turns: 23
- Program turns: 29
- PromptItems executed: 23
- PromptItems skipped: 1
- Fallbacks: 0
- Repairs: 0
- Provider errors: 0
- Clarifications: 0
- Safety overrides: 0
- Final state: completed
- Result: **PASS**

## Executed PromptItems

- tbct-s02-n01-p01-first-session-opening
- tbct-s02-n02-p01-problem-framing
- tbct-s02-n02-p02-problem-home-work-relationships
- tbct-s02-n02-p03-problem-avoidance
- tbct-s02-n02-p04-problem-therapy-goal
- tbct-s02-n02-p05-problem-forward-importance
- tbct-s02-n02-p06-problem-confirmation
- tbct-s02-n03-p01-offer-private-placeholders
- tbct-s02-n04-p01-rating-card-check
- tbct-s02-n05-p01-reflect-problem-score
- tbct-s02-n06-p01-problem-total
- tbct-s02-n06-p02-problem-total-personal
- tbct-s02-n07-p01-goal-framing
- tbct-s02-n07-p02-goal-life-change
- tbct-s02-n07-p03-goal-difficult-action
- tbct-s02-n07-p04-goal-freedom
- tbct-s02-n07-p05-goal-dream
- tbct-s02-n07-p07-goal-confirmation
- tbct-s02-n08-p01-goal-rating-card-check
- tbct-s02-n09-p01-reflect-goal-score
- tbct-s02-n10-p01-goal-total
- tbct-s02-n10-p02-goal-total-personal
- tbct-s02-n11-p02-recorded-summary

## Field extraction

- Expected reachable fields: openingMode, betweenSessionWork, problems, problemFraming, privateProblemPlaceholders, problemScaleCardAvailable, problemScalePresented, problemScaleDistinctionAcknowledged, problemRatings, totalProblemScore, yellowRedProblemsCount, goals, goalProblemOverlap, goalScaleCardAvailable, goalScalePresented, goalRatings, totalGoalsScore, yellowRedGoalsCount, closingAcknowledgement
- Captured fields: openingMode, problems, privateProblemPlaceholders, problemScaleCardAvailable, problemRatings, totalProblemScore, yellowRedProblemsCount, tbct-s02-n06-p02-problem-total-personal:response, goals, goalScaleCardAvailable, goalRatings, totalGoalsScore, yellowRedGoalsCount, tbct-s02-n10-p02-goal-total-personal:response
- Missing fields: none
