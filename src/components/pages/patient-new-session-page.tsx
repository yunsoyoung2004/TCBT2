"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { PatientShell } from "@/components/runtime/patient-shell";
import { Button, Card } from "@/components/ui/primitives";
import { createCanonicalTestRuntimeSession, createRuntimeSession, listCanonicalTestSessions, listPatientAvailableRuntimeReleases } from "@/lib/api/runtime-session-api";
import { startRuntimeSession } from "@/lib/api/runtime-execution-api";

export function PatientNewSessionPage() {
  const router = useRouter();
  const releasesQuery = useQuery({ queryKey: ["patient-runtime-releases", "tbct-br-001"], queryFn: () => listPatientAvailableRuntimeReleases("tbct-br-001") });
  const testSessionsQuery = useQuery({ queryKey: ["canonical-test-runtime-sessions"], queryFn: listCanonicalTestSessions });
  const releases = releasesQuery.data ?? [];
  const testSessions = testSessionsQuery.data ?? [];
  const [selectedReleaseId, setSelectedReleaseId] = useState("");
  const [isStartingTestSession, setIsStartingTestSession] = useState(false);
  const selectedRelease = releases.find((release) => release.id === selectedReleaseId) ?? releases[0];
  const sessions = selectedRelease?.sessions ?? [];

  useEffect(() => {
    if (selectedRelease && selectedReleaseId !== selectedRelease.id) setSelectedReleaseId(selectedRelease.id);
  }, [selectedRelease, selectedReleaseId]);

  const handleStartSession = async (sessionId: string) => {
    if (!selectedRelease) return;
    try {
      const session = await createRuntimeSession({
        projectId: "TBCT-BR-001",
        protocolId: "TBCT-BR-001",
        releaseId: selectedRelease.id,
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

  const handleStartTestSession = async (sessionDefinitionId: string) => {
    setIsStartingTestSession(true);
    try {
      const session = await createCanonicalTestRuntimeSession({ sessionDefinitionId });
      await startRuntimeSession(session.id);
      router.push(`/projects/demo/patient/sessions/${session.id}`);
    } catch (error) {
      console.error("Test session start failed:", error);
      toast.error(error instanceof Error ? error.message : "Unable to start the test session.");
    } finally {
      setIsStartingTestSession(false);
    }
  };

  return (
    <PatientShell title="Choose Session">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
          <label className="grid gap-1 text-sm font-medium text-text-primary">
            Published release
            <select className="min-w-64 rounded-panel border border-border bg-surface px-3 py-2 text-sm text-text-primary" value={selectedRelease?.id ?? ""} onChange={(event) => setSelectedReleaseId(event.target.value)} disabled={!releases.length}>
              {releases.map((release) => <option key={release.id} value={release.id}>{`v${release.version} · ${new Date(release.publishedAt).toLocaleDateString()}`}</option>)}
            </select>
          </label>
          {selectedRelease && <div className="text-xs text-text-secondary">{selectedRelease.changeSummary}</div>}
        </div>
        {releasesQuery.isLoading ? (
          <Card className="p-4 text-sm text-text-secondary">Loading published releases...</Card>
        ) : !selectedRelease ? (
          <Card className="p-4 text-sm text-text-secondary">No published protocol release is available.</Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {sessions.map((session) => (
              <div key={session.id} className="cursor-pointer" onClick={() => handleStartSession(session.id)}>
                <Card className="flex h-full flex-col gap-4 p-4 transition hover:border-clinical-blue hover:shadow-lg">
                  <div>
                    <div className="font-semibold text-text-primary">{session.title}</div>
                    <div className="mt-1 text-xs text-text-secondary">{`Session ${session.number}`}</div>
                  </div>
                  <Button className="mt-auto">Start</Button>
                </Card>
              </div>
            ))}
          </div>
        )}
        <section className="space-y-3 border-t border-border pt-4">
          <div>
            <div className="text-sm font-semibold text-text-primary">Test Sessions</div>
            <div className="mt-1 text-xs text-text-secondary">Use the canonical source runtime without publishing a release.</div>
          </div>
          {testSessionsQuery.isLoading ? (
            <Card className="p-4 text-sm text-text-secondary">Loading test sessions...</Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {testSessions.map((session) => (
                <Card key={session.id} className="flex min-h-40 flex-col gap-4 p-4">
                  <div>
                    <div className="font-semibold text-text-primary">{session.title}</div>
                    <div className="mt-1 text-xs text-text-secondary">{`Session ${session.number} · ${session.techniqueName}`}</div>
                  </div>
                  <Button className="mt-auto" onClick={() => void handleStartTestSession(session.id)} disabled={isStartingTestSession}>
                    {isStartingTestSession ? "Starting test..." : "Start test"}
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </PatientShell>
  );
}
