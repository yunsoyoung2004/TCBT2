# TBCT-S07 fidelity audit

- Release: demo-release
- Patient turns: 42
- Program turns: 47
- PromptItems executed: 25
- PromptItems skipped: 1
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
- tbct-s07-n01-p03-crp-worksheet-ready
- tbct-s07-n03-p01-ambivalence-normalization
- tbct-s07-n04-p01-action-in-own-words
- tbct-s07-n04-p02-disadvantages-first
- tbct-s07-n04-p03-advantages-second
- tbct-s07-n05-p01-emotion-weight
- tbct-s07-n05-p02-reason-weight
- tbct-s07-n06-p01-chair-arrangement
- tbct-s07-n06-p02-emotion-to-reason
- tbct-s07-n06-p03-continue-dialogue
- tbct-s07-n07-p01-consensus-transition
- tbct-s07-n07-p02-consensus-learning
- tbct-s07-n07-p03-consensus-surprise
- tbct-s07-n07-p04-consensus-emotion-intent
- tbct-s07-n07-p05-consensus-parts-needs
- tbct-s07-n08-p01-consensus-weights
- tbct-s07-n09-p01-readiness-decision
- tbct-s07-n10-p01-proposed-actions
- tbct-s07-n10-p02-possible-obstacles
- tbct-s07-n10-p03-obstacle-solutions
- tbct-s07-n10-p04-implementation-plan
- tbct-s07-n10-p05-support-people
- tbct-s07-n10-p06-follow-up

## Field extraction

- Expected reachable fields: crpOfferResponse, crpConsent, crpWorksheetReady, sessionLanguage, languageLocked, crpPrinciplesAcknowledged, liveAvoidanceAcknowledged, ambivalenceAcknowledged, desiredOrFearedAction, disadvantages, advantages, emotionDisadvantageWeight, reasonAdvantageWeight, ambivalenceSplitNamed, chairArrangementConfirmed, emotionReasonDialogue, consensusChairReady, consensusLearning, consensusSurprise, consensusEmotionIntent, consensusPartsNeeds, consensusAdvantageWeight, consensusDisadvantageWeight, implementationReadiness, laterReadinessPreparation, colourCodedScopeAcknowledged, proposedActions, possibleObstacles, obstacleSolutions, implementationPlan, supportPeople, followUpPlan, crpPlanSummary
- Captured fields: sessionLanguage, languageLocked, crpOfferResponse, prosecutionEvidenceSufficient, defenseEvidenceSufficient, appealEvidenceSufficient, emotionReasonDialogueSufficient, disadvantagesSufficient, advantagesSufficient, consensusLearningSufficient, prosecutionRebuttalsComplete, defenseSurrebuttalsComplete, thereforeConclusionsComplete, crpConsent, crpWorksheetReady, crpPrinciplesAcknowledged, ambivalenceAcknowledged, desiredOrFearedAction, disadvantages, disadvantagesNoMore, disadvantagesDuplicate, disadvantagesCount, advantages, advantagesNoMore, advantagesDuplicate, advantagesCount, emotionDisadvantageWeight, reasonAdvantageWeight, ambivalenceSplitNamed, chairArrangementConfirmed, emotionReasonDialogue, emotionReasonDialogueNoMore, emotionReasonDialogueDuplicate, emotionReasonSpeakers, emotionReasonDialogueCount, emotionReasonSpeakersCount, consensusChairReady, consensusLearning, consensusLearningNoMore, consensusLearningDuplicate, consensusLearningCount, consensusSurprise, consensusEmotionIntent, consensusPartsNeeds, consensusAdvantageWeight, consensusDisadvantageWeight, implementationReadiness, colourCodedScopeAcknowledged, proposedActions, possibleObstacles, obstacleSolutions, implementationPlan, supportPeople, followUpPlan, crpPlanSummary
- Missing fields: none
