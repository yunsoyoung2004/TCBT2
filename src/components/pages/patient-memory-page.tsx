"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PatientShell } from "@/components/runtime/patient-shell";
import { Badge, Button, Card, EmptyState, Field, PageSkeleton, inputClass } from "@/components/ui/primitives";
import { getOrCreateDemoParticipant, getParticipantConsentHistory, updateParticipantConsent } from "@/lib/api/participant-api";
import { getParticipantMemories } from "@/lib/api/longitudinal-memory-api";

export function PatientMemoryPage() {
  const queryClient = useQueryClient();
  const participantQuery = useQuery({ queryKey: ["demo-participant"], queryFn: getOrCreateDemoParticipant });
  const memoryQuery = useQuery({
    queryKey: ["patient-memories", participantQuery.data?.id],
    queryFn: () => getParticipantMemories(participantQuery.data!.id),
    enabled: Boolean(participantQuery.data?.id),
  });
  const consentHistoryQuery = useQuery({
    queryKey: ["patient-consent-history", participantQuery.data?.id],
    queryFn: () => getParticipantConsentHistory(participantQuery.data!.id),
    enabled: Boolean(participantQuery.data?.id),
  });
  const consentMutation = useMutation({
    mutationFn: () =>
      updateParticipantConsent(participantQuery.data!.id, {
        memoryStorageAllowed,
        crossSessionUseAllowed,
        sensitiveMemoryAllowed,
        reason: "Patient updated memory preferences",
      }),
    onSuccess: async () => {
      toast.success("Memory preferences saved");
      await queryClient.invalidateQueries({ queryKey: ["demo-participant"] });
      await queryClient.invalidateQueries({ queryKey: ["patient-memories"] });
      await queryClient.invalidateQueries({ queryKey: ["patient-consent-history"] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to save memory preferences");
    },
  });
  const [memoryStorageAllowed, setMemoryStorageAllowed] = useState(true);
  const [crossSessionUseAllowed, setCrossSessionUseAllowed] = useState(true);
  const [sensitiveMemoryAllowed, setSensitiveMemoryAllowed] = useState(false);

  useEffect(() => {
    if (!participantQuery.data) return;
    setMemoryStorageAllowed(participantQuery.data.consent.memoryStorageAllowed);
    setCrossSessionUseAllowed(participantQuery.data.consent.crossSessionUseAllowed);
    setSensitiveMemoryAllowed(participantQuery.data.consent.sensitiveMemoryAllowed);
  }, [participantQuery.data]);
  if (participantQuery.isLoading || memoryQuery.isLoading || consentHistoryQuery.isLoading) return <PatientShell title="Memory"><PageSkeleton /></PatientShell>;
  const participant = participantQuery.data;
  const consentHistory = consentHistoryQuery.data ?? [];
  const visible = (memoryQuery.data ?? []).filter((memory) => memory.status === "approved" && !memory.isSystemDerived && memory.sensitivity !== "safety_restricted" && memory.memoryType !== "clinician_note");
  if (!participant) return <PatientShell title="Memory"><Card><EmptyState title="Participant not found" /></Card></PatientShell>;
  return (
    <PatientShell title="Memory" sessionLabel={participant.alias} progressLabel={participant.status} actions={<Button variant="secondary" onClick={() => consentMutation.mutate()}>{participant.consent.crossSessionUseAllowed ? "Save memory settings" : "Save memory settings"}</Button>}>
      <div className="space-y-4">
        <Card className="p-4">
          <div className="text-sm font-semibold text-text-primary">Memory controls</div>
          <div className="mt-2 text-xs text-text-secondary">Only approved and patient-viewable memory is shown here. Safety-restricted or clinician-only memory is not displayed.</div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Field label="Memory snapshot name"><input className={inputClass} value={participant.alias} readOnly /></Field>
            <div className="grid gap-3 rounded-panel border border-border bg-surface-subtle p-3 text-sm text-text-secondary">
              <label className="flex items-center justify-between gap-3"><span>Store memory</span><input type="checkbox" checked={memoryStorageAllowed} onChange={(event) => setMemoryStorageAllowed(event.target.checked)} /></label>
              <label className="flex items-center justify-between gap-3"><span>Reuse across sessions</span><input type="checkbox" checked={crossSessionUseAllowed} onChange={(event) => setCrossSessionUseAllowed(event.target.checked)} /></label>
              <label className="flex items-center justify-between gap-3"><span>Allow sensitive memory</span><input type="checkbox" checked={sensitiveMemoryAllowed} onChange={(event) => setSensitiveMemoryAllowed(event.target.checked)} /></label>
            </div>
          </div>
        </Card>
        {!visible.length && <Card><EmptyState title="No patient-visible memory" description="Approved goals, preferences, and homework will appear here." /></Card>}
        <Card className="p-4">
          <div className="text-sm font-semibold text-text-primary">Recent consent changes</div>
          <div className="mt-3 space-y-2">
            {!consentHistory.length && <div className="text-sm text-text-secondary">No consent changes yet.</div>}
            {consentHistory.slice().reverse().map((entry) => (
              <div key={entry.id} className="rounded-panel border border-border bg-surface-subtle p-3 text-sm">
                <div className="font-semibold text-text-primary">{entry.reason ?? "Consent updated"}</div>
                <div className="mt-1 text-xs text-text-secondary">{new Date(entry.effectiveAt).toLocaleString("ko-KR")}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge tone={entry.crossSessionUseAllowed ? "success" : "warning"}>Cross-session {entry.crossSessionUseAllowed ? "on" : "off"}</Badge>
                  <Badge tone={entry.memoryStorageAllowed ? "success" : "critical"}>Memory storage {entry.memoryStorageAllowed ? "on" : "off"}</Badge>
                  <Badge tone={entry.sensitiveMemoryAllowed ? "warning" : "neutral"}>Sensitive {entry.sensitiveMemoryAllowed ? "on" : "off"}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
        {visible.map((memory) => (
          <Card key={memory.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-text-primary">{memory.title}</div>
                <div className="mt-1 text-sm text-text-secondary">{memory.content}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="primary">{memory.memoryType}</Badge>
                <Badge tone="neutral">{memory.status}</Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </PatientShell>
  );
}
