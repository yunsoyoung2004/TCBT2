# TBCT-S03 fidelity audit

- Release: demo-release
- Patient turns: 27
- Program turns: 31
- PromptItems executed: 27
- PromptItems skipped: 3
- Fallbacks: 0
- Repairs: 0
- Provider errors: 0
- Clarifications: 0
- Safety overrides: 0
- Final state: completed
- Result: **PASS**

## Executed PromptItems

- tbct-s03-n01-p01-safety-check
- tbct-s03-n02-p01-fourteen-question-introduction
- tbct-s03-n03-p01-describe-situation
- tbct-s03-n04-p01-automatic-thought
- tbct-s03-n06-p01-rate-at-belief
- tbct-s03-n07-p01-primary-emotion
- tbct-s03-n07-p03-emotion-intensity
- tbct-s03-n08-p01-behavior
- tbct-s03-n08-p02-body-sensations
- tbct-s03-n08-p03-participant-summary
- tbct-s03-n08-p04-cycle-note
- tbct-s03-n09-p01-behavior-pros
- tbct-s03-n09-p03-behavior-cons
- tbct-s03-n09-p04-cognitive-distortion
- tbct-s03-n10-p01-evidence-for
- tbct-s03-n10-p03-evidence-against
- tbct-s03-n11-p01-balanced-conclusion
- tbct-s03-n11-p02-therefore-extension
- tbct-s03-n11-p03-full-conclusion-readback
- tbct-s03-n11-p04-conclusion-belief
- tbct-s03-n12-p01-positive-emotions-first
- tbct-s03-n12-p02-original-negative-emotion
- tbct-s03-n12-p03-emotion-intensities
- tbct-s03-n13-p01-intended-action
- tbct-s03-n13-p03-new-body-sensations
- tbct-s03-n13-p04-repeat-exact-at
- tbct-s03-n13-p05-global-evaluation

## Field extraction

- Expected reachable fields: safetyCheck, intraTrIntroductionComplete, situation, automaticThought, workingAutomaticThought, factualThoughtConfirmed, automaticThoughtBeliefPercent, primaryEmotion, primaryEmotionIntensityPercent, behavior, bodySensations, participantSummary, cycleSummaryAcknowledged, behaviorPros, behaviorCons, cognitiveDistortion, evidenceFor, evidenceAgainst, balancedConclusion, conclusionTherefore, conclusionReadBackComplete, conclusionBeliefPercent, positiveEmotions, originalEmotionRerating, newEmotionIntensities, intendedActions, newBodySensations, revisedAutomaticThoughtBeliefPercent, globalEvaluation, closingReview, actionPlanOffer
- Captured fields: safetyCheck, intraTrIntroductionComplete, situation, automaticThought, automaticThoughtBeliefPercent, primaryEmotion, primaryEmotionIntensityPercent, behavior, bodySensations, participantSummary, cycleSummaryAcknowledged, behaviorPros, behaviorCons, cognitiveDistortion, evidenceFor, evidenceForNoMore, evidenceAgainst, evidenceAgainstNoMore, balancedConclusion, conclusionTherefore, conclusionReadBackComplete, conclusionBeliefPercent, positiveEmotions, originalEmotionRerating, newEmotionIntensities, intendedActions, newBodySensations, revisedAutomaticThoughtBeliefPercent, globalEvaluation
- Missing fields: none
