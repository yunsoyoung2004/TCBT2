import { getAuthenticatedCaller } from "@/lib/supabase/server";
import { runWithRuntimeRequestContext } from "@/lib/server/runtime-request-context";
import type { PatientInput } from "@/types/runtime-session";

export const runtime = "nodejs";
export const maxDuration = 60;

type TurnBody = {
  sessionId?: string;
  patientInput?: PatientInput;
  options?: { clientTurnId?: string; expectedSessionVersion?: number; locale?: string };
};

const encode = (value: unknown) => new TextEncoder().encode(`data: ${JSON.stringify(value)}\n\n`);

export async function POST(request: Request) {
  const caller = await getAuthenticatedCaller();
  if (!caller) return new Response("Not authenticated", { status: 401 });
  const body = await request.json() as TurnBody;
  if (!body.sessionId || !body.patientInput) return new Response("Invalid patient turn", { status: 400 });

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encode({ type: "accepted" }));
      void runWithRuntimeRequestContext(request, async () => {
        try {
          const { submitPatientInput } = await import("@/lib/api/runtime-execution-api");
          const result = await submitPatientInput(body.sessionId!, body.patientInput!, body.options);
          controller.enqueue(encode({ type: "result", result }));
        } catch (error) {
          console.error("[runtime-turn] patient turn failed", error);
          controller.enqueue(encode({ type: "error", error: error instanceof Error ? error.message : "Patient turn failed" }));
        } finally {
          controller.close();
        }
      });
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
