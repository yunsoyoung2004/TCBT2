"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { PatientShell } from "@/components/runtime/patient-shell";
import { Button, Card } from "@/components/ui/primitives";
import { createCanonicalTestRuntimeSession, listCanonicalTestSessions } from "@/lib/api/runtime-session-api";
import { startRuntimeSession } from "@/lib/api/runtime-execution-api";

// The product now runs a single TCBT flow (no protocol/manual picker before a
// session can start). This page only lets the patient pick which of the
// program's fixed session numbers (S01-S08) to begin or resume next.
export function PatientNewSessionPage() {
  const router = useRouter();
  const sessionsQuery = useQuery({ queryKey: ["canonical-test-runtime-sessions"], queryFn: listCanonicalTestSessions });
  const sessions = sessionsQuery.data ?? [];
  const [startingSessionId, setStartingSessionId] = useState<string | null>(null);

  const handleStartSession = async (sessionDefinitionId: string) => {
    setStartingSessionId(sessionDefinitionId);
    try {
      const session = await createCanonicalTestRuntimeSession({ sessionDefinitionId });
      await startRuntimeSession(session.id);
      router.push(`/projects/demo/patient/sessions/${session.id}`);
    } catch (error) {
      console.error("Session start failed:", error);
      toast.error(error instanceof Error ? error.message : "Unable to start the session.");
    } finally {
      setStartingSessionId(null);
    }
  };

  return (
    <PatientShell title="Start Session">
      <div className="space-y-4">
        <div className="border-b border-border pb-4">
          <h2 className="text-lg font-semibold text-text-primary">Choose a session</h2>
          <p className="mt-1 text-sm text-text-secondary">Pick the next session in your program.</p>
        </div>
        {sessionsQuery.isLoading ? (
          <Card className="p-4 text-sm text-text-secondary">Loading sessions...</Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {sessions.map((session) => (
              <Card key={session.id} className="flex h-full flex-col gap-4 p-4 transition hover:border-clinical-blue hover:shadow-lg">
                <div>
                  <div className="font-semibold text-text-primary">{session.title}</div>
                  <div className="mt-1 text-xs text-text-secondary">{`Session ${session.number} · ${session.techniqueName}`}</div>
                </div>
                <Button className="mt-auto" onClick={() => void handleStartSession(session.id)} disabled={startingSessionId !== null}>
                  {startingSessionId === session.id ? "Starting..." : "Start"}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PatientShell>
  );
}
