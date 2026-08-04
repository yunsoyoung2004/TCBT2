"use client";

import { useRouter } from "next/navigation";
import { PatientShell } from "@/components/runtime/patient-shell";
import { Button, Card } from "@/components/ui/primitives";
import { createRuntimeSession } from "@/lib/api/runtime-session-api";
import { startRuntimeSession } from "@/lib/api/runtime-execution-api";

const FALLBACK_SESSIONS = [
  { id: "tbct-s01", label: "Introduction to the TBCT Model" },
  { id: "tbct-s02", label: "Problems and Goals" },
  { id: "tbct-s03", label: "Intrapersonal Thought Record (Intra-TR)" },
  { id: "tbct-s04", label: "Interpersonal Thought Record (Inter-TR)" },
  { id: "tbct-s05", label: "Participation Grid (PG)" },
  { id: "tbct-s06", label: "Color-Coded Symptoms Hierarchy (CCSH)" },
  { id: "tbct-s07", label: "Consensual Role-Play (CRP)" },
  { id: "tbct-s08", label: "Trial One" },
];

export function PatientNewSessionPage() {
  const router = useRouter();

  const handleStartSession = async (sessionId: string) => {
    try {
      const session = await createRuntimeSession({
        projectId: "TBCT-BR-001",
        protocolId: "TBCT-BR-001",
        releaseId: "demo-release",
        sessionDefinitionId: sessionId,
        participantId: "demo-participant",
        patientAlias: "Demo Patient",
        locale: "ko-KR",
      });
      
      await startRuntimeSession(session.id);
      router.push(`/projects/demo/patient/sessions/${session.id}`);
    } catch (error) {
      console.error("Session start failed:", error);
    }
  };

  return (
    <PatientShell title="Choose Session">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FALLBACK_SESSIONS.map((session) => (
          <div key={session.id} className="cursor-pointer" onClick={() => handleStartSession(session.id)}>
            <Card className="hover:border-clinical-blue hover:shadow-lg transition p-4 flex flex-col gap-4 h-full">
              <div>
                <div className="font-semibold text-text-primary">{session.label}</div>
                <div className="text-xs text-text-secondary mt-1">{session.id}</div>
              </div>
              <Button className="mt-auto">Start</Button>
            </Card>
          </div>
        ))}
      </div>
    </PatientShell>
  );
}
