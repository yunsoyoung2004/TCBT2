import type { SessionFigureConfig } from "@/lib/worksheet/figure-registry/types";
import { TBCT_S03_FIGURE } from "@/lib/worksheet/figure-registry/tbct-s03-figure";

// Add a session's figure config here once its source figure has been
// extracted and its regions measured (see tbct-s03-figure.ts's header for
// the extraction method). Sessions not yet listed fall back to the generic
// field-status view in worksheet-pane.tsx.
const SESSION_FIGURE_REGISTRY: Partial<Record<string, SessionFigureConfig>> = {
  "tbct-s03": TBCT_S03_FIGURE,
};

export function getSessionFigureConfig(sessionDefinitionId: string): SessionFigureConfig | undefined {
  return SESSION_FIGURE_REGISTRY[sessionDefinitionId];
}
