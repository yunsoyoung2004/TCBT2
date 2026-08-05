# TBCT-S06 fidelity audit

- Release: demo-release
- Patient turns: 19
- Program turns: 28
- PromptItems executed: 19
- PromptItems skipped: 2
- Fallbacks: 0
- Repairs: 0
- Provider errors: 0
- Clarifications: 0
- Safety overrides: 0
- Final state: completed
- Result: **PASS**

## Executed PromptItems

- tbct-s06-n01-p01-warm-opening
- tbct-s06-n01-p02-symptom-list-opening
- tbct-s06-n03-p01-concrete-actions
- tbct-s06-n03-p02-modifier-decomposition
- tbct-s06-n03-p03-close-list
- tbct-s06-n04-p02-calibration-anchor
- tbct-s06-n05-p01-item-score
- tbct-s06-n06-p01-value-linked-discomfort
- tbct-s06-n06-p02-professional-effort
- tbct-s06-n06-p03-participant-capsule-summary
- tbct-s06-n07-p01-choose-green-items
- tbct-s06-n07-p02-accountability-partner
- tbct-s06-n07-p03-plan-b
- tbct-s06-n08-p04-homework-confirmation
- tbct-s06-n09-p01-relief-curve
- tbct-s06-n09-p02-next-meeting
- tbct-s06-n10-p02-patient-formulates-ua
- tbct-s06-n10-p04-place-on-diagram
- tbct-s06-n10-p05-circuit-two-summary

## Field extraction

- Expected reachable fields: sessionLanguage, languageLocked, symptomItems, inRoomSafetyBehaviorCheck, colorScalePresented, calibrationScore, colorZoneRulesAcknowledged, symptomItemScores, discomfortDistressSummary, greenHomeworkItems, accountabilityPartner, fallbackPlan, exposurePrinciplesAcknowledged, reliefVersusOvercomingInsight, safetyBehaviors, underlyingAssumption, circuitTwo, circuitTwoSummary, ccshWorksheet, homeworkSelectionCorrection
- Captured fields: sessionLanguage, languageLocked, symptomItems, calibrationScore, symptomItemScores, discomfortDistressSummary, greenHomeworkItems, accountabilityPartner, fallbackPlan, reliefVersusOvercomingInsight, underlyingAssumption, circuitTwo, circuitTwoSummary
- Missing fields: none
