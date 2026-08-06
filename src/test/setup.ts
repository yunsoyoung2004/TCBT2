import "fake-indexeddb/auto";
import "@testing-library/jest-dom";
import { afterEach, beforeEach } from "vitest";
import { RUNTIME_STORE_ENDPOINT } from "@/lib/runtime/runtime-store-ops";
import { PARTICIPANT_STORE_ENDPOINT } from "@/lib/runtime/participant-store-ops";
import { SAFETY_STORE_ENDPOINT } from "@/lib/runtime/safety-store-ops";
import { dispatchFakeRuntimeStoreOp, resetFakeRuntimeStore } from "@/test/fakes/runtime-session-store.fake";
import { dispatchFakeParticipantStoreOp, resetFakeParticipantStore } from "@/test/fakes/participant-store.fake";
import { dispatchFakeSafetyStoreOp, resetFakeSafetyStore } from "@/test/fakes/safety-store.fake";

// The runtime conversation store now lives in Postgres in production
// (src/app/api/runtime/session-store/route.ts), reached via fetch() from
// src/lib/repositories/runtime-session-repository.ts. Tests must stay fast,
// offline, and independent of the live database, so requests to that one
// endpoint are intercepted here and served from an in-memory fake with the
// exact same op contract; everything else falls through to the real fetch.
// The participant roster and clinician safety-monitoring stores moved to
// Postgres the same way and are intercepted here too, for the same reason.
const realFetch = globalThis.fetch;
const FAKE_STORES: Array<{ endpoint: string; dispatch: (op: unknown) => Promise<unknown> }> = [
  { endpoint: RUNTIME_STORE_ENDPOINT, dispatch: dispatchFakeRuntimeStoreOp as (op: unknown) => Promise<unknown> },
  { endpoint: PARTICIPANT_STORE_ENDPOINT, dispatch: dispatchFakeParticipantStoreOp as (op: unknown) => Promise<unknown> },
  { endpoint: SAFETY_STORE_ENDPOINT, dispatch: dispatchFakeSafetyStoreOp as (op: unknown) => Promise<unknown> },
];

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const store = init?.method === "POST" ? FAKE_STORES.find((candidate) => url.endsWith(candidate.endpoint)) : undefined;
  if (store) {
    try {
      const op = JSON.parse(init!.body as string);
      const result = await store.dispatch(op);
      return new Response(JSON.stringify({ ok: true, result }), { status: 200, headers: { "content-type": "application/json" } });
    } catch (error) {
      return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { "content-type": "application/json" } });
    }
  }
  return realFetch(input, init);
}) as typeof fetch;

beforeEach(() => {
  resetFakeRuntimeStore();
  resetFakeParticipantStore();
  resetFakeSafetyStore();
});

afterEach(() => {
  resetFakeRuntimeStore();
  resetFakeParticipantStore();
  resetFakeSafetyStore();
});
