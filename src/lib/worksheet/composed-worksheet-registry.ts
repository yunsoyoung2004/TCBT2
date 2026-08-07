import type { ComponentType } from "react";
import { S01Worksheet } from "@/components/runtime/worksheet-renderers/s01-worksheet";
import { S02Worksheet } from "@/components/runtime/worksheet-renderers/s02-worksheet";
import { S04Worksheet } from "@/components/runtime/worksheet-renderers/s04-worksheet";
import { S05Worksheet } from "@/components/runtime/worksheet-renderers/s05-worksheet";
import { S06Worksheet } from "@/components/runtime/worksheet-renderers/s06-worksheet";
import { S07Worksheet } from "@/components/runtime/worksheet-renderers/s07-worksheet";
import { S08Worksheet } from "@/components/runtime/worksheet-renderers/s08-worksheet";
import type { WorksheetView } from "@/types/worksheet";

export interface ComposedWorksheetProps {
  view: WorksheetView;
  activeCanonicalFieldKey?: string;
  onConfirm: (worksheetFieldKey: string) => void;
  onEdit: (worksheetFieldKey: string, value: unknown) => void;
  busy: boolean;
}

// Session-specific "recreate the figure in real HTML/CSS" worksheets --
// each one has a genuinely different layout matching that session's own
// manual figure (see src/components/runtime/worksheet-renderers/s0N-worksheet.tsx).
// Deliberately excludes tbct-s03: that session keeps the coordinate-mapped
// photo-overlay renderer (figure-registry + FigureWorkspace), checked
// separately and first in worksheet-pane.tsx.
const REGISTRY: Partial<Record<string, ComponentType<ComposedWorksheetProps>>> = {
  "tbct-s01": S01Worksheet,
  "tbct-s02": S02Worksheet,
  "tbct-s04": S04Worksheet,
  "tbct-s05": S05Worksheet,
  "tbct-s06": S06Worksheet,
  "tbct-s07": S07Worksheet,
  "tbct-s08": S08Worksheet,
};

export function getComposedWorksheet(sessionDefinitionId: string): ComponentType<ComposedWorksheetProps> | undefined {
  return REGISTRY[sessionDefinitionId];
}
