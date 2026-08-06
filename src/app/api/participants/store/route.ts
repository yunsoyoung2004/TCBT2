import { NextResponse } from "next/server";
import { dispatchParticipantStoreOp } from "@/lib/server/participant-store";
import type { ParticipantStoreOp } from "@/lib/runtime/participant-store-ops";

export const runtime = "nodejs";

// Single RPC endpoint for the participant roster + longitudinal memory
// (clinician notes) store (see src/lib/runtime/participant-store-ops.ts for
// the op contract). This is the shared read/write path so a participant
// created from the patient-facing runtime is visible from the clinician
// Patient Monitoring screens, and vice versa --
// src/lib/repositories/participant-repository.ts and (for clinician-note
// operations) longitudinal-memory-repository.ts are thin fetch clients over
// this route.
export async function POST(request: Request) {
  try {
    const op = (await request.json()) as ParticipantStoreOp;
    const result = await dispatchParticipantStoreOp(op);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Participant store operation failed." }, { status: 500 });
  }
}
