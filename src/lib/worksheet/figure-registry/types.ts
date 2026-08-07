import type { WorksheetValueType } from "@/types/worksheet";

/** One fillable region on a session's source TBCT figure, positioned in
 * coordinates normalized to the figure asset's own pixel dimensions (0-1
 * fractions of assetWidth/assetHeight), never raw pixels -- so the overlay
 * stays aligned regardless of render size, zoom, or viewport.
 * `runtimeField` must be a real PromptItem.outputFields[0] key already
 * present in the session's worksheet-bindings/*.ts registry; this file
 * never invents a field, it only positions ones that already exist. */
export interface FigureFieldRegion {
  id: string;
  /** Must match a WorksheetBinding.canonicalFieldKey for this session. */
  runtimeField: string;
  x: number;
  y: number;
  width: number;
  height: number;
  align?: "left" | "center";
  fontScale?: number;
  participantOwned: boolean;
  assistantMustNotSupply: boolean;
  /** How the overlay should render this region's value. */
  display?: "text" | "percent" | "list" | "choice";
  /** For display: "choice" -- the figure already prints one checkbox per
   * option (e.g. Q14's "The same / A little better / Much better"); each
   * entry positions one checkbox (region-relative, like FigureFieldRegion's
   * own coordinates) and the overlay marks whichever one matches the
   * field's current value instead of rendering text. */
  choiceOptions?: Array<{ value: string; label: string; x: number; y: number; size: number }>;
}

export interface SessionFigureConfig {
  sessionDefinitionId: string;
  /** Source note for the "final report" traceability requirement -- which
   * manual page/figure this was extracted from, and how (see Final Report
   * in the accompanying chat message for the full provenance record). */
  sourceNote: string;
  /** The extracted source-figure asset -- a real crop of the manual's own
   * page render (see scripts used at authoring time), not a hand-drawn
   * approximation. Path is public/-relative. */
  assetSrc: string;
  assetWidth: number;
  assetHeight: number;
  regions: FigureFieldRegion[];
}

export type { WorksheetValueType };
