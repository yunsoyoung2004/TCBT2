import type { WorksheetBinding } from "@/types/worksheet";
import { TBCT_S03_BINDINGS } from "@/lib/worksheet/worksheet-bindings/tbct-s03";

// Add a session's binding module here to extend worksheet coverage. Every
// entry must reference a real canonicalFieldKey (see the per-session file's
// header comment for how it was verified against source-fidelity-catalog.ts).
const REGISTRY: Record<string, WorksheetBinding[]> = {
  "tbct-s03": TBCT_S03_BINDINGS,
};

export function getWorksheetBindings(sessionDefinitionId: string): WorksheetBinding[] {
  return REGISTRY[sessionDefinitionId] ?? [];
}

export function hasWorksheetBindings(sessionDefinitionId: string): boolean {
  return Boolean(REGISTRY[sessionDefinitionId]?.length);
}
