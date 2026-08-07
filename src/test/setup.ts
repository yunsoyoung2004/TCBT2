import "fake-indexeddb/auto";
import "@testing-library/jest-dom";
import { afterEach, beforeEach } from "vitest";
import { RUNTIME_STORE_ENDPOINT } from "@/lib/runtime/runtime-store-ops";
import { PARTICIPANT_STORE_ENDPOINT } from "@/lib/runtime/participant-store-ops";
import { SAFETY_STORE_ENDPOINT } from "@/lib/runtime/safety-store-ops";
import { PROTOCOL_STUDIO_STORE_ENDPOINT } from "@/lib/runtime/protocol-studio-store-ops";
import { dispatchFakeRuntimeStoreOp, resetFakeRuntimeStore } from "@/test/fakes/runtime-session-store.fake";
import { dispatchFakeParticipantStoreOp, resetFakeParticipantStore } from "@/test/fakes/participant-store.fake";
import { dispatchFakeSafetyStoreOp, resetFakeSafetyStore } from "@/test/fakes/safety-store.fake";
import { dispatchFakeProtocolStudioStoreOp, resetFakeProtocolStudioStore } from "@/test/fakes/protocol-studio-store.fake";
import { WORKSHEET_STORE_ENDPOINT } from "@/lib/runtime/worksheet-store-ops";
import { dispatchFakeWorksheetStoreOp, resetFakeWorksheetStore } from "@/test/fakes/worksheet-store.fake";
import { dispatchFakeDialogueAgent } from "@/test/fakes/dialogue-agent.fake";
import { dialogueContractSchema } from "@/lib/dialogue-agent/dialogue-agent-contract";

// The runtime conversation store now lives in Postgres in production
// (src/app/api/runtime/session-store/route.ts), reached via fetch() from
// src/lib/repositories/runtime-session-repository.ts. Tests must stay fast,
// offline, and independent of the live database, so requests to that one
// endpoint are intercepted here and served from an in-memory fake with the
// exact same op contract; everything else falls through to the real fetch.
// The participant roster, clinician safety-monitoring store, and Protocol
// Studio audit log moved to Postgres the same way and are intercepted here
// too, for the same reason -- saveAuditEntry in particular is called from
// deep inside ordinary protocol/session writes, so leaving it unintercepted
// breaks any test that touches those paths, not just audit-log tests.
const realFetch = globalThis.fetch;
const FAKE_STORES: Array<{ endpoint: string; dispatch: (op: unknown) => Promise<unknown> }> = [
  { endpoint: RUNTIME_STORE_ENDPOINT, dispatch: dispatchFakeRuntimeStoreOp as (op: unknown) => Promise<unknown> },
  { endpoint: PARTICIPANT_STORE_ENDPOINT, dispatch: dispatchFakeParticipantStoreOp as (op: unknown) => Promise<unknown> },
  { endpoint: SAFETY_STORE_ENDPOINT, dispatch: dispatchFakeSafetyStoreOp as (op: unknown) => Promise<unknown> },
  { endpoint: PROTOCOL_STUDIO_STORE_ENDPOINT, dispatch: dispatchFakeProtocolStudioStoreOp as (op: unknown) => Promise<unknown> },
  { endpoint: WORKSHEET_STORE_ENDPOINT, dispatch: dispatchFakeWorksheetStoreOp as (op: unknown) => Promise<unknown> },
];

// /api/dialogue-agent has a different body shape ({contract, context}, not
// an op union) so it's intercepted separately rather than folded into
// FAKE_STORES -- without this, the dialogue-agent client's browser-path
// fetch() (taken in jsdom's test environment, which defines `window`) would
// hit a real network address that doesn't exist under test, and every test
// would only ever see the "provider unavailable" deterministic fallback
// instead of a realistic classification to assert against.
const DIALOGUE_AGENT_ENDPOINT = "/api/dialogue-agent";

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  if (init?.method === "POST" && url.endsWith(DIALOGUE_AGENT_ENDPOINT)) {
    try {
      const body = JSON.parse(init!.body as string) as { contract: unknown };
      const contract = dialogueContractSchema.parse(body.contract);
      return new Response(JSON.stringify({ ok: true, data: dispatchFakeDialogueAgent(contract) }), { status: 200, headers: { "content-type": "application/json" } });
    } catch (error) {
      return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { "content-type": "application/json" } });
    }
  }
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
  resetFakeProtocolStudioStore();
  resetFakeWorksheetStore();
});

afterEach(() => {
  resetFakeRuntimeStore();
  resetFakeParticipantStore();
  resetFakeSafetyStore();
  resetFakeProtocolStudioStore();
  resetFakeWorksheetStore();
});
