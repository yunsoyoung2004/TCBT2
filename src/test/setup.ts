import "fake-indexeddb/auto";
import "@testing-library/jest-dom";
import { afterEach, beforeEach } from "vitest";
import { RUNTIME_STORE_ENDPOINT } from "@/lib/runtime/runtime-store-ops";
import { dispatchFakeRuntimeStoreOp, resetFakeRuntimeStore } from "@/test/fakes/runtime-session-store.fake";

// The runtime conversation store now lives in Postgres in production
// (src/app/api/runtime/session-store/route.ts), reached via fetch() from
// src/lib/repositories/runtime-session-repository.ts. Tests must stay fast,
// offline, and independent of the live database, so requests to that one
// endpoint are intercepted here and served from an in-memory fake with the
// exact same op contract; everything else falls through to the real fetch.
const realFetch = globalThis.fetch;

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  if (url.endsWith(RUNTIME_STORE_ENDPOINT) && init?.method === "POST") {
    try {
      const op = JSON.parse(init.body as string);
      const result = await dispatchFakeRuntimeStoreOp(op);
      return new Response(JSON.stringify({ ok: true, result }), { status: 200, headers: { "content-type": "application/json" } });
    } catch (error) {
      return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { "content-type": "application/json" } });
    }
  }
  return realFetch(input, init);
}) as typeof fetch;

beforeEach(() => {
  resetFakeRuntimeStore();
});

afterEach(() => {
  resetFakeRuntimeStore();
});
