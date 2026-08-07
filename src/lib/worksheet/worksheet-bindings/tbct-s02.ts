import type { WorksheetBinding } from "@/types/worksheet";

// Session 2 (Problems and Goals / CCPH+CCGH) worksheet binding registry.
// problems/goals are arrays; problemRatings/goalRatings are parallel arrays
// of 0-5 scores (index-matched) -- the composed worksheet zips them
// together into the color-coded hierarchy rows the source figure shows.
export const TBCT_S02_BINDINGS: WorksheetBinding[] = [
  { sessionDefinitionId: "tbct-s02", canonicalFieldKey: "problems", worksheetFieldKey: "problems", visualElementId: "list-problems", valueType: "text_list", participantOwned: true, assistantMustNotSupply: true, confirmationRequired: false, displayMode: "list", label: "Problems", sourceSection: "CCPH", displayOrder: 0 },
  { sessionDefinitionId: "tbct-s02", canonicalFieldKey: "problemRatings", worksheetFieldKey: "problemRatings", visualElementId: "chip-problem-scores", valueType: "text_list", participantOwned: true, assistantMustNotSupply: true, confirmationRequired: false, displayMode: "list", label: "Problem scores", sourceSection: "CCPH", displayOrder: 1 },
  { sessionDefinitionId: "tbct-s02", canonicalFieldKey: "totalProblemScore", worksheetFieldKey: "totalProblemScore", visualElementId: "chip-total-problems", valueType: "integer", participantOwned: false, assistantMustNotSupply: false, confirmationRequired: false, displayMode: "number", label: "Total problem score", sourceSection: "CCPH", displayOrder: 2 },
  { sessionDefinitionId: "tbct-s02", canonicalFieldKey: "goals", worksheetFieldKey: "goals", visualElementId: "list-goals", valueType: "text_list", participantOwned: true, assistantMustNotSupply: true, confirmationRequired: false, displayMode: "list", label: "Goals", sourceSection: "CCGH", displayOrder: 3 },
  { sessionDefinitionId: "tbct-s02", canonicalFieldKey: "goalRatings", worksheetFieldKey: "goalRatings", visualElementId: "chip-goal-scores", valueType: "text_list", participantOwned: true, assistantMustNotSupply: true, confirmationRequired: false, displayMode: "list", label: "Goal scores", sourceSection: "CCGH", displayOrder: 4 },
  { sessionDefinitionId: "tbct-s02", canonicalFieldKey: "totalGoalsScore", worksheetFieldKey: "totalGoalsScore", visualElementId: "chip-total-goals", valueType: "integer", participantOwned: false, assistantMustNotSupply: false, confirmationRequired: false, displayMode: "number", label: "Total goals score", sourceSection: "CCGH", displayOrder: 5 },
];
