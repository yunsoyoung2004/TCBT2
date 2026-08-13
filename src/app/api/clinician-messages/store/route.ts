import { NextResponse } from "next/server";
import { dispatchClinicianMessageStoreOp } from "@/lib/server/clinician-message-store";
import { getParticipantByAuthUserId } from "@/lib/server/participant-store";
import type { ClinicianMessageRequest } from "@/lib/runtime/clinician-message-store-ops";
import { getAuthenticatedCaller } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Single RPC endpoint for the patient<->clinician message thread.
// senderRole/senderUserId are ALWAYS derived here from the authenticated
// caller, never taken from the request body -- see
// clinician-message-store-ops.ts's own doc comment for why. A patient may
// only send/read their own participant's thread; a clinician may
// send/read any participant's (matches this app's existing "clinicians
// share one flat pool" model, e.g. participants/store/route.ts).
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ClinicianMessageRequest;
    const caller = await getAuthenticatedCaller();
    if (!caller) return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
    if (!caller.role) return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 403 });

    if (caller.role === "patient") {
      const own = await getParticipantByAuthUserId(caller.userId);
      if (!own || own.id !== body.participantId) {
        return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 403 });
      }
    }

    if (body.op === "send") {
      if (!body.body?.trim()) return NextResponse.json({ ok: false, error: "Message body is required." }, { status: 400 });
      const senderRole = caller.role === "admin" ? "clinician" : caller.role;
      const result = await dispatchClinicianMessageStoreOp({ op: "send", participantId: body.participantId, senderRole, senderUserId: caller.userId, body: body.body.trim() });
      return NextResponse.json({ ok: true, result });
    }

    const result = await dispatchClinicianMessageStoreOp(body);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Clinician message store operation failed." }, { status: 500 });
  }
}
