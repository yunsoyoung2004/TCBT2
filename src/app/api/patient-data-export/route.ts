import { NextResponse } from "next/server";
import { getParticipantByAuthUserId } from "@/lib/server/participant-store";
import { listRuntimeSessionRecordsByParticipant } from "@/lib/server/runtime-session-store";
import { dispatchClinicianMessageStoreOp } from "@/lib/server/clinician-message-store";
import { dispatchMoodCheckinStoreOp } from "@/lib/server/mood-checkin-store";
import { dispatchStandardizedAssessmentStoreOp } from "@/lib/server/standardized-assessment-store";
import { getAuthenticatedCaller } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Patient self-service data export -- a live read straight from the
// existing stores (no separate export table). Reads
// session.runtimeContext.fields directly rather than reconstructing
// worksheet display values: that field IS the canonical clinical data
// (see worksheet-projection.ts's own header comment), so it's a more
// complete export than re-deriving the worksheet projection would be.
// Patient-only, own participant only -- there is no "export any
// participant" mode here even for clinicians/admin (a different, larger
// feature: a compliance export tool, not this one).
export async function GET() {
  const caller = await getAuthenticatedCaller();
  if (!caller) return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  if (caller.role !== "patient") return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 403 });

  const participant = await getParticipantByAuthUserId(caller.userId);
  if (!participant) return NextResponse.json({ ok: false, error: "Participant record not found." }, { status: 404 });

  const [sessions, messages, moodCheckins, standardizedAssessments] = await Promise.all([
    listRuntimeSessionRecordsByParticipant(participant.id),
    dispatchClinicianMessageStoreOp({ op: "listByParticipant", participantId: participant.id }),
    dispatchMoodCheckinStoreOp({ op: "listByParticipant", participantId: participant.id }),
    dispatchStandardizedAssessmentStoreOp({ op: "listResponsesByParticipant", participantId: participant.id }),
  ]);

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    participant,
    sessions,
    messages,
    moodCheckins,
    standardizedAssessments,
  };

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="tbct-my-data-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
