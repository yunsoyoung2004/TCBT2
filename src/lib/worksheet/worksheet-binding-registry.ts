import type { WorksheetBinding } from "@/types/worksheet";
import { TBCT_S01_BINDINGS } from "@/lib/worksheet/worksheet-bindings/tbct-s01";
import { TBCT_S02_BINDINGS } from "@/lib/worksheet/worksheet-bindings/tbct-s02";
import { TBCT_S03_BINDINGS } from "@/lib/worksheet/worksheet-bindings/tbct-s03";
import { TBCT_S04_BINDINGS } from "@/lib/worksheet/worksheet-bindings/tbct-s04";
import { TBCT_S05_BINDINGS } from "@/lib/worksheet/worksheet-bindings/tbct-s05";
import { TBCT_S06_BINDINGS } from "@/lib/worksheet/worksheet-bindings/tbct-s06";
import { TBCT_S07_BINDINGS } from "@/lib/worksheet/worksheet-bindings/tbct-s07";
import { TBCT_S08_BINDINGS } from "@/lib/worksheet/worksheet-bindings/tbct-s08";

// Add a session's binding module here to extend worksheet coverage. Every
// entry must reference a real canonicalFieldKey (see the per-session file's
// header comment for how it was verified against source-fidelity-catalog.ts).
const REGISTRY: Record<string, WorksheetBinding[]> = {
  "tbct-s01": TBCT_S01_BINDINGS,
  "tbct-s02": TBCT_S02_BINDINGS,
  "tbct-s03": TBCT_S03_BINDINGS,
  "tbct-s04": TBCT_S04_BINDINGS,
  "tbct-s05": TBCT_S05_BINDINGS,
  "tbct-s06": TBCT_S06_BINDINGS,
  "tbct-s07": TBCT_S07_BINDINGS,
  "tbct-s08": TBCT_S08_BINDINGS,
};

export function getWorksheetBindings(sessionDefinitionId: string): WorksheetBinding[] {
  return REGISTRY[sessionDefinitionId] ?? [];
}

export function hasWorksheetBindings(sessionDefinitionId: string): boolean {
  return Boolean(REGISTRY[sessionDefinitionId]?.length);
}
