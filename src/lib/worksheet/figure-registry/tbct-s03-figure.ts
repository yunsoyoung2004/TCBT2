import type { FigureFieldRegion, SessionFigureConfig } from "@/lib/worksheet/figure-registry/types";

// Extracted from the actual TBCT_Session_03_Manual.pdf (Annex, page 5:
// "Your Intra-TR Worksheet" -> "The TBCT Intrapersonal Thought Record
// (Intra-TR)"), rendered at 3x scale via pdf-to-img and cropped with sharp
// to isolate the figure itself (excludes the ANNEX heading, intro
// paragraph, copyright caption, and the "Where it fits" table below it).
// Asset: public/assets/tbct-figures/tbct-s03-intra-tr.png, 1404x1012px.
//
// Region coordinates below were measured by visual inspection of that
// exact crop (pixel position / asset dimension), not guessed from field
// names -- see the chat's Final Report for the per-region confidence note.
// Every runtimeField is a real canonicalFieldKey already present in
// worksheet-bindings/tbct-s03.ts; nothing here is invented.
const ASSET_WIDTH = 1404;
const ASSET_HEIGHT = 1012;

function region(px: { x: number; y: number; w: number; h: number }, rest: Omit<FigureFieldRegion, "x" | "y" | "width" | "height">): FigureFieldRegion {
  return { ...rest, x: px.x / ASSET_WIDTH, y: px.y / ASSET_HEIGHT, width: px.w / ASSET_WIDTH, height: px.h / ASSET_HEIGHT };
}

export const TBCT_S03_FIGURE_REGIONS: FigureFieldRegion[] = [
  region({ x: 160, y: 95, w: 220, h: 95 }, { id: "situation", runtimeField: "situation", participantOwned: true, assistantMustNotSupply: false, display: "text" }),
  region({ x: 525, y: 170, w: 195, h: 80 }, { id: "automaticThought", runtimeField: "automaticThought", participantOwned: true, assistantMustNotSupply: false, display: "text", fontScale: 0.9 }),
  region({ x: 660, y: 250, w: 55, h: 20 }, { id: "automaticThoughtBeliefPercent", runtimeField: "automaticThoughtBeliefPercent", participantOwned: true, assistantMustNotSupply: false, display: "percent" }),
  region({ x: 775, y: 240, w: 230, h: 70 }, { id: "primaryEmotion", runtimeField: "primaryEmotion", participantOwned: true, assistantMustNotSupply: false, display: "text" }),
  region({ x: 940, y: 315, w: 60, h: 20 }, { id: "primaryEmotionIntensityPercent", runtimeField: "primaryEmotionIntensityPercent", participantOwned: true, assistantMustNotSupply: false, display: "percent" }),
  region({ x: 1050, y: 295, w: 245, h: 80 }, { id: "behavior", runtimeField: "behavior", participantOwned: true, assistantMustNotSupply: false, display: "text", fontScale: 0.9 }),
  region({ x: 1050, y: 405, w: 245, h: 50 }, { id: "bodySensations", runtimeField: "bodySensations", participantOwned: true, assistantMustNotSupply: false, display: "text", fontScale: 0.9 }),
  region({ x: 275, y: 350, w: 620, h: 22 }, { id: "behaviorPros", runtimeField: "behaviorPros", participantOwned: true, assistantMustNotSupply: false, display: "text", fontScale: 0.85, align: "left" }),
  region({ x: 290, y: 388, w: 1000, h: 35 }, { id: "behaviorCons", runtimeField: "behaviorCons", participantOwned: true, assistantMustNotSupply: false, display: "text", fontScale: 0.85, align: "left" }),
  region({ x: 595, y: 423, w: 415, h: 20 }, { id: "cognitiveDistortion", runtimeField: "cognitiveDistortion", participantOwned: true, assistantMustNotSupply: false, display: "text", fontScale: 0.85, align: "left" }),
  region({ x: 300, y: 440, w: 1070, h: 50 }, { id: "evidenceFor", runtimeField: "evidenceFor", participantOwned: true, assistantMustNotSupply: false, display: "list", fontScale: 0.85, align: "left" }),
  region({ x: 420, y: 494, w: 950, h: 65 }, { id: "evidenceAgainst", runtimeField: "evidenceAgainst", participantOwned: true, assistantMustNotSupply: false, display: "list", fontScale: 0.85, align: "left" }),
  region({ x: 512, y: 680, w: 225, h: 75 }, { id: "balancedConclusion", runtimeField: "balancedConclusion", participantOwned: true, assistantMustNotSupply: false, display: "text", fontScale: 0.85 }),
  region({ x: 660, y: 758, w: 55, h: 20 }, { id: "conclusionBeliefPercent", runtimeField: "conclusionBeliefPercent", participantOwned: true, assistantMustNotSupply: false, display: "percent" }),
  // The original figure's second "Emotion" box (11a/11b, positive/negative
  // + strength) has no runtime binding yet -- positiveEmotions/
  // originalEmotionRerating/newEmotionIntensities need a multi-emotion
  // renderer this pass doesn't build (see worksheet-bindings/tbct-s03.ts).
  // The box itself still prints from the source figure; it just never gets
  // an overlay value. Flagged here rather than silently mapped.
  region({ x: 1050, y: 725, w: 245, h: 45 }, { id: "intendedActions", runtimeField: "intendedActions", participantOwned: true, assistantMustNotSupply: false, display: "list", fontScale: 0.85 }),
  region({ x: 1050, y: 800, w: 245, h: 80 }, { id: "newBodySensations", runtimeField: "newBodySensations", participantOwned: true, assistantMustNotSupply: false, display: "text", fontScale: 0.85 }),
  region({ x: 405, y: 808, w: 55, h: 20 }, { id: "revisedAutomaticThoughtBeliefPercent", runtimeField: "revisedAutomaticThoughtBeliefPercent", participantOwned: true, assistantMustNotSupply: false, display: "percent" }),
  region(
    { x: 260, y: 828, w: 260, h: 82 },
    {
      id: "globalEvaluation",
      runtimeField: "globalEvaluation",
      participantOwned: true,
      assistantMustNotSupply: false,
      display: "choice",
      choiceOptions: [
        { value: "same", label: "The same", x: (270 - 260) / 260, y: (835 - 828) / 82, size: 20 / 82 },
        { value: "a little better", label: "A little better", x: (270 - 260) / 260, y: (858 - 828) / 82, size: 20 / 82 },
        { value: "much better", label: "Much better", x: (270 - 260) / 260, y: (882 - 828) / 82, size: 20 / 82 },
      ],
    },
  ),
];

export const TBCT_S03_FIGURE: SessionFigureConfig = {
  sessionDefinitionId: "tbct-s03",
  sourceNote: "TBCT_Session_03_Manual.pdf, Annex p.5 (\"Your Intra-TR Worksheet\" / \"The TBCT Intrapersonal Thought Record (Intra-TR)\"), rendered @3x via pdf-to-img and cropped to the figure bounds with sharp.",
  assetSrc: "/assets/tbct-figures/tbct-s03-intra-tr.png",
  assetWidth: ASSET_WIDTH,
  assetHeight: ASSET_HEIGHT,
  regions: TBCT_S03_FIGURE_REGIONS,
};
