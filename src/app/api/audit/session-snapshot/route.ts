import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { z } from "zod";

export const runtime = "nodejs";
const snapshotSchema = z.object({
  runtimeSessionId: z.string().regex(/^RTS-[A-Za-z0-9-]+$/),
  sessionVersion: z.number().int().nonnegative(),
  capturedAt: z.string().datetime(),
  snapshot: z.record(z.unknown()),
});

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 2_000_000) return NextResponse.json({ ok: false, error: "Audit snapshot is too large." }, { status: 413 });
    const body = snapshotSchema.parse(await request.json());
    const safeTimestamp = body.capturedAt.replace(/[:.]/g, "-");
    const serialized = JSON.stringify(body);
    const options = { access: "private" as const, addRandomSuffix: false, contentType: "application/json" };
    await Promise.all([
      put(`session-audit/${body.runtimeSessionId}/history/v${body.sessionVersion}-${safeTimestamp}.json`, serialized, options),
      put(`session-audit/${body.runtimeSessionId}/latest.json`, serialized, { ...options, allowOverwrite: true }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Audit snapshot failed." }, { status: 500 });
  }
}
