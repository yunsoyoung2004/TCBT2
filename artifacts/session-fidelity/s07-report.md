# TBCT-S07 fidelity audit

- Release: demo-release
- Patient turns: 12
- Program turns: 25
- PromptItems executed: 12
- PromptItems skipped: 0
- Fallbacks: 0
- Repairs: 0
- Provider errors: 0
- Clarifications: 0
- Safety overrides: 0
- Final state: completed
- Result: **PASS**

## Executed PromptItems

- tbct-s07-n01-p01-crp-offer
- tbct-s07-n01-p02-crp-consent
- tbct-s07-n04-p01-action-in-own-words
- tbct-s07-n04-p02-disadvantages-first
- tbct-s07-n04-p03-advantages-second
- tbct-s07-n05-p01-emotion-weight
- tbct-s07-n05-p02-reason-weight
- tbct-s07-n06-p03-continue-dialogue
- tbct-s07-n07-p02-consensus-learning
- tbct-s07-n07-p03-consensus-surprise
- tbct-s07-n08-p01-consensus-weights
- tbct-s07-n09-p01-readiness-decision

## Field extraction

- Expected reachable fields: crpConsent, sessionLanguage, languageLocked, crpPrinciplesAcknowledged, liveAvoidanceAcknowledged, ambivalenceAcknowledged, desiredOrFearedAction, disadvantages, advantages, emotionDisadvantageWeight, reasonAdvantageWeight, chairArrangementConfirmed, emotionReasonDialogue, consensusChairReady, consensusLearning, consensusAdvantageWeight, consensusDisadvantageWeight, implementationReadiness, laterReadinessPreparation, proposedActions, possibleObstacles, obstacleSolutions, implementationPlan, supportPeople, followUpPlan, crpPlanSummary
- Captured fields: crpConsent, desiredOrFearedAction, disadvantages, advantages, emotionDisadvantageWeight, reasonAdvantageWeight, emotionReasonDialogue, consensusLearning, consensusAdvantageWeight, consensusDisadvantageWeight, implementationReadiness
- Missing fields: none
