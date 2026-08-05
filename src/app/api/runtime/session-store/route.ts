import { NextResponse } from "next/server";
import { dispatchRuntimeStoreOp } from "@/lib/server/runtime-session-store";
import type { RuntimeStoreOp } from "@/lib/runtime/runtime-store-ops";

export const runtime = "nodejs";

// Single RPC endpoint for the runtime conversation store (see
// src/lib/runtime/runtime-store-ops.ts for the op contract). This is the
// operational read/write path for patient <-> assistant sessions --
// src/lib/repositories/runtime-session-repository.ts is a thin fetch client
// over this route, so every call site across the app is unaffected by the
// storage backend living in Postgres now instead of local IndexedDB.
export async function POST(request: Request) {
  try {
    const op = (await request.json()) as RuntimeStoreOp;
    const result = await dispatchRuntimeStoreOp(op);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Runtime store operation failed." }, { status: 500 });
  }
}
