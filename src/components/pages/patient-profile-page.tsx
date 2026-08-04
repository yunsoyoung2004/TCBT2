"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PatientShell } from "@/components/runtime/patient-shell";
import { Badge, Button, Card, EmptyState, Field, PageSkeleton, inputClass } from "@/components/ui/primitives";
import { getOrCreateDemoParticipant, getParticipantRecord, updateParticipantProfile, updateParticipantConsent } from "@/lib/api/participant-api";
import { getParticipantLongitudinalDashboard } from "@/lib/api/longitudinal-memory-api";

export function PatientProfilePage() {
  const queryClient = useQueryClient();
  const participantQuery = useQuery({ queryKey: ["demo-participant"], queryFn: getOrCreateDemoParticipant });
  const dashboardQuery = useQuery({
    queryKey: ["patient-profile-dashboard", participantQuery.data?.id],
    queryFn: () => getParticipantLongitudinalDashboard(participantQuery.data!.id),
    enabled: Boolean(participantQuery.data?.id),
  });
  const recordQuery = useQuery({
    queryKey: ["patient-record", participantQuery.data?.id],
    queryFn: () => getParticipantRecord(participantQuery.data!.id),
    enabled: Boolean(participantQuery.data?.id),
  });
  const [alias, setAlias] = useState("");
  const [locale, setLocale] = useState("ko-KR");
  const [country, setCountry] = useState("KR");
  const [memoryStorageAllowed, setMemoryStorageAllowed] = useState(true);
  const [crossSessionUseAllowed, setCrossSessionUseAllowed] = useState(true);
  const [sensitiveMemoryAllowed, setSensitiveMemoryAllowed] = useState(false);

  useEffect(() => {
    if (!participantQuery.data) return;
    setAlias(participantQuery.data.alias);
    setLocale(participantQuery.data.locale);
    setCountry(participantQuery.data.country ?? "KR");
    setMemoryStorageAllowed(participantQuery.data.consent.memoryStorageAllowed);
    setCrossSessionUseAllowed(participantQuery.data.consent.crossSessionUseAllowed);
    setSensitiveMemoryAllowed(participantQuery.data.consent.sensitiveMemoryAllowed);
  }, [participantQuery.data]);

  const profileMutation = useMutation({
    mutationFn: async () => {
      if (!participantQuery.data) throw new Error("Participant not found");
      await updateParticipantProfile(participantQuery.data.id, { alias, locale, country, status: participantQuery.data.status });
      await updateParticipantConsent(participantQuery.data.id, {
        memoryStorageAllowed,
        crossSessionUseAllowed,
        sensitiveMemoryAllowed,
        reason: "Patient profile settings updated",
      });
    },
    onSuccess: async () => {
      toast.success("Profile saved");
      await queryClient.invalidateQueries({ queryKey: ["demo-participant"] });
      await queryClient.invalidateQueries({ queryKey: ["patient-profile-dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["patient-record"] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to save profile");
    },
  });
  if (participantQuery.isLoading || dashboardQuery.isLoading || recordQuery.isLoading) return <PatientShell title="Participant Profile"><PageSkeleton /></PatientShell>;
  const participant = participantQuery.data;
  const dashboard = dashboardQuery.data;
  if (!participant || !dashboard) return <PatientShell title="Participant Profile"><Card><EmptyState title="Participant not found" /></Card></PatientShell>;
  return (
    <PatientShell title="Participant Profile" sessionLabel={participant.alias} progressLabel={participant.status} actions={<Link href="/projects/demo/patient/memory"><Button variant="secondary">Open memory</Button></Link>}>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <div className="text-sm font-semibold text-text-primary">Consent</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone={participant.consent.memoryStorageAllowed ? "success" : "critical"}>Memory storage</Badge>
            <Badge tone={participant.consent.crossSessionUseAllowed ? "success" : "warning"}>Cross-session use</Badge>
            <Badge tone={participant.consent.sensitiveMemoryAllowed ? "warning" : "neutral"}>Sensitive memory</Badge>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-semibold text-text-primary">Continuity</div>
          <div className="mt-2 text-xs text-text-secondary">Sessions {participant.runtimeSessionIds.length}</div>
          <div className="mt-2 text-xs text-text-secondary">Active memories {recordQuery.data?.activeMemoryIds.length ?? 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-semibold text-text-primary">Current items</div>
          <div className="mt-2 text-xs text-text-secondary">Active goals {dashboard.goals.filter((item) => item.status === "active").length}</div>
          <div className="mt-2 text-xs text-text-secondary">Unresolved homework {dashboard.homework.filter((item) => item.status === "assigned" || item.status === "in_progress").length}</div>
        </Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="text-sm font-semibold text-text-primary">Edit profile</div>
          <div className="mt-4 grid gap-4">
            <Field label="Display name"><input className={inputClass} value={alias} onChange={(event) => setAlias(event.target.value)} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Locale"><select className={inputClass} value={locale} onChange={(event) => setLocale(event.target.value)}><option value="ko-KR">ko-KR</option><option value="en-US">en-US</option><option value="pt-BR">pt-BR</option><option value="fr-FR">fr-FR</option></select></Field>
              <Field label="Country"><input className={inputClass} value={country} onChange={(event) => setCountry(event.target.value)} /></Field>
            </div>
            <div className="grid gap-3 rounded-panel border border-border bg-surface-subtle p-3 text-sm text-text-secondary">
              <label className="flex items-center justify-between gap-3"><span>Store memory</span><input type="checkbox" checked={memoryStorageAllowed} onChange={(event) => setMemoryStorageAllowed(event.target.checked)} /></label>
              <label className="flex items-center justify-between gap-3"><span>Reuse across sessions</span><input type="checkbox" checked={crossSessionUseAllowed} onChange={(event) => setCrossSessionUseAllowed(event.target.checked)} /></label>
              <label className="flex items-center justify-between gap-3"><span>Allow sensitive memory</span><input type="checkbox" checked={sensitiveMemoryAllowed} onChange={(event) => setSensitiveMemoryAllowed(event.target.checked)} /></label>
            </div>
            <Button loading={profileMutation.isPending} onClick={() => profileMutation.mutate()}>Save profile</Button>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-semibold text-text-primary">Saved memory snapshot</div>
          <div className="mt-3 space-y-2 text-sm text-text-secondary">
            <div>Participant record: {recordQuery.data?.id ?? "Unavailable"}</div>
            <div>Active memory IDs: {recordQuery.data?.activeMemoryIds.length ?? 0}</div>
            <div>Latest summary: {recordQuery.data?.latestSummaryId ?? "None"}</div>
          </div>
        </Card>
      </div>
    </PatientShell>
  );
}
