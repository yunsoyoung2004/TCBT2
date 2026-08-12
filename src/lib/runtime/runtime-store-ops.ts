// Shared client/server contract for the runtime conversation store (Neon
// Postgres). This file has no server-only imports -- it is safe to import
// from both the browser-facing repository client and the server-side store
// implementation (real or fake), so the two never drift out of sync.
import type {
  ClinicianEscalationEvent,
  RuntimeCheckpoint,
  RuntimeExecutionTrace,
  RuntimeMessage,
  RuntimeProviderEvent,
  RuntimeSession,
  RuntimeValidationEvent,
  SessionExecutionLog,
} from "@/types/runtime-session";

export type CommitRuntimeAssistantTurnInput = {
  sessionId: string;
  assistantMessage: RuntimeMessage;
  providerEvent: RuntimeProviderEvent;
  validationEvent: RuntimeValidationEvent;
  trace: RuntimeExecutionTrace;
  sessionPatch: Partial<RuntimeSession>;
};

export type RuntimePatientTurnClaim =
  | { claimed: true; session: RuntimeSession }
  | { claimed: false; session: RuntimeSession };

export type CommitRuntimeAssistantTurnResult = {
  session: RuntimeSession;
  assistantMessage: RuntimeMessage;
  duplicate: boolean;
};

export type RuntimeStoreOp =
  | { op: "createSession"; session: RuntimeSession }
  | { op: "updateSession"; sessionId: string; patch: Partial<RuntimeSession> }
  | { op: "claimPatientTurn"; sessionId: string; clientTurnId: string; expectedSessionVersion: number; patientMessage: RuntimeMessage }
  | { op: "getSession"; sessionId: string }
  | { op: "listSessions" }
  | { op: "listSessionsByParticipant"; participantId: string }
  | { op: "deleteSession"; sessionId: string }
  | { op: "saveMessage"; message: RuntimeMessage }
  | { op: "listMessages"; runtimeSessionId: string }
  | { op: "saveLog"; log: SessionExecutionLog }
  | { op: "listLogs"; runtimeSessionId: string }
  | { op: "saveCheckpoint"; checkpoint: RuntimeCheckpoint }
  | { op: "getLatestCheckpoint"; runtimeSessionId: string }
  | { op: "listCheckpoints"; runtimeSessionId: string }
  | { op: "saveEscalation"; event: ClinicianEscalationEvent }
  | { op: "updateEscalation"; escalationId: string; patch: Partial<ClinicianEscalationEvent> }
  | { op: "listEscalations" }
  | { op: "listEscalationsBySession"; runtimeSessionId: string }
  | { op: "saveProviderEvent"; event: RuntimeProviderEvent }
  | { op: "listProviderEvents"; runtimeSessionId: string }
  | { op: "saveValidationEvent"; event: RuntimeValidationEvent }
  | { op: "listValidationEvents"; runtimeSessionId: string }
  | { op: "saveExecutionTrace"; trace: RuntimeExecutionTrace }
  | { op: "listExecutionTraces"; runtimeSessionId: string }
  | { op: "commitAssistantTurn"; input: CommitRuntimeAssistantTurnInput };

export const RUNTIME_STORE_ENDPOINT = "/api/runtime/session-store";
