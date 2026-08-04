"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { Badge, Button, Card, EmptyState, PageHeader, PageSkeleton, SectionHeader } from "@/components/ui/primitives";
import { getRuntimeSession } from "@/lib/api/runtime-session-api";

export function RuntimeInspectorPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;
  const sessionQuery = useQuery({ queryKey: ["runtime-inspector", sessionId], queryFn: () => getRuntimeSession(sessionId), enabled: Boolean(sessionId) });
  if (sessionQuery.isLoading) return <AppShell><PageSkeleton /></AppShell>;
  if (!sessionQuery.data) return <AppShell><Card className="m-4 lg:m-6"><EmptyState title="Runtime session not found" /></Card></AppShell>;
  const { session, participant, messages, logs, escalations, checkpoints, providerEvents, validationEvents, nodes, edges, memoryRetrievalRuns, memoryUsageLogs } = sessionQuery.data;
  const currentNode = nodes.find((node) => node.id === session.currentNodeId);
  return (
    <AppShell>
      <PageHeader
        eyebrow="Stage 2 + Stage 3 Runtime Inspector"
        title={`Runtime Session ${session.patientAlias}`}
        description="Runtime state, provider events, output validation, memory retrieval, and execution log are shown from the same local runtime data."
        meta={<><Badge tone="primary">{session.status}</Badge><Badge tone="neutral">{session.protocolVersion}</Badge><Badge tone="warning">{session.sessionDefinitionId}</Badge></>}
        actions={
          <>
            <Link href={`/projects/demo/patient/sessions/${session.id}`}><Button variant="secondary">Open patient session</Button></Link>
            <Link href={`/runtime/sessions/${session.id}/summary`}><Button variant="secondary">Open summary</Button></Link>
            {participant && <Link href={`/runtime/participants/${participant.id}`}><Button variant="secondary">Participant dashboard</Button></Link>}
          </>
        }
      />
      <div className="space-y-4 p-4 lg:p-6">
        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <Card className="p-4">
            <SectionHeader title="Overview" description="Current runtime status and continuity state." />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Metric label="Current node" value={currentNode?.title ?? "Unknown"} />
              <Metric label="Participant" value={participant?.alias ?? session.participantId} />
              <Metric label="Messages" value={`${messages.length}`} />
              <Metric label="Memory runs" value={`${memoryRetrievalRuns?.length ?? 0}`} />
            </div>
          </Card>
          <Card className="p-4">
            <SectionHeader title="Current State" description="Runtime context snapshot including injected memory namespace." />
            <pre className="mt-4 overflow-auto rounded-panel border border-border bg-surface-subtle p-3 text-xs text-text-secondary">{JSON.stringify(session.runtimeContext, null, 2)}</pre>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <Card className="overflow-hidden">
            <SectionHeader title="Messages" description="Delivered patient, assistant, system, and clinician messages." />
            <div className="space-y-2 p-4">
              {messages.map((message) => (
                <div key={message.id} className="rounded-panel border border-border p-3">
                  <div className="text-xs font-semibold text-text-muted">{message.role} · {message.status}</div>
                  <div className="mt-1 text-sm text-text-primary">{message.content}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="overflow-hidden">
            <SectionHeader title="Execution Log" description="Runtime cycle log." />
            <div className="space-y-2 p-4">
              {logs.map((log) => (
                <div key={log.id} className="rounded-panel border border-border p-3">
                  <div className="text-xs font-semibold text-text-muted">{log.stage} · {log.status}</div>
                  <div className="mt-1 text-sm text-text-primary">{log.summary}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
          <Card className="p-4">
            <SectionHeader title="Safety" description="Escalation and safety results." />
            <div className="mt-4 space-y-2">
              {escalations.length ? escalations.map((item) => <Metric key={item.id} label={item.severity} value={item.triggerSummary} />) : <div className="text-xs text-text-secondary">No escalation recorded.</div>}
            </div>
          </Card>
          <Card className="p-4">
            <SectionHeader title="Provider" description="Language provider events." />
            <div className="mt-4 space-y-2">
              {providerEvents.length ? providerEvents.map((event) => <Metric key={event.id} label={event.provider} value={`${event.model} · ${event.latencyMs ?? 0}ms`} />) : <div className="text-xs text-text-secondary">No provider event yet.</div>}
            </div>
          </Card>
          <Card className="p-4">
            <SectionHeader title="Output Validation" description="Output validator results." />
            <div className="mt-4 space-y-2">
              {validationEvents.length ? validationEvents.map((event) => <Metric key={event.id} label={event.accepted ? "accepted" : "fallback"} value={event.issues.join(", ") || "clean"} />) : <div className="text-xs text-text-secondary">No validation event yet.</div>}
            </div>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <Card className="p-4">
            <SectionHeader title="Memory" description="Selective retrieval result, exclusions, and injection trace." />
            <div className="mt-4 space-y-3">
              {(memoryRetrievalRuns ?? []).map((run) => (
                <div key={run.id} className="rounded-panel border border-border p-3">
                  <div className="text-xs font-semibold text-text-muted">Run {run.id}</div>
                  <div className="mt-1 text-sm text-text-primary">Selected {run.selectedMemoryIds.length} of {run.candidatesEvaluated}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {run.selectedMemoryIds.map((memoryId) => <Badge key={memoryId} tone="primary">{memoryId}</Badge>)}
                  </div>
                  <div className="mt-2 text-xs text-text-secondary">{run.excluded.slice(0, 3).map((item) => `${item.memoryId}: ${item.reason}`).join(" · ") || "No exclusions"}</div>
                </div>
              ))}
              {!memoryRetrievalRuns?.length && <div className="text-xs text-text-secondary">No retrieval run recorded yet.</div>}
            </div>
          </Card>
          <Card className="p-4">
            <SectionHeader title="Memory Usage" description="Retrieval and injection usage logs." />
            <div className="mt-4 space-y-2">
              {(memoryUsageLogs ?? []).map((item) => (
                <div key={item.id} className="rounded-panel border border-border p-3">
                  <div className="text-xs font-semibold text-text-muted">{item.usageType}</div>
                  <div className="mt-1 text-sm text-text-primary">{item.reason}</div>
                </div>
              ))}
              {!memoryUsageLogs?.length && <div className="text-xs text-text-secondary">No memory usage log yet.</div>}
            </div>
          </Card>
        </div>

        <Card className="p-4">
          <SectionHeader title="Protocol Path" description="Current release snapshot path basis." />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {nodes.map((node) => (
              <div key={node.id} className={`rounded-panel border p-3 ${session.currentNodeId === node.id ? "border-clinical-blue bg-clinical-blue-light/60" : "border-border"}`}>
                <div className="text-sm font-semibold text-text-primary">{node.title}</div>
                <div className="mt-1 text-xs text-text-secondary">{node.type}</div>
                <div className="mt-2 text-[11px] text-text-muted">
                  Next: {edges.filter((edge) => edge.source === node.id).map((edge) => edge.target).join(", ") || "end"}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs text-text-secondary">Checkpoints: {checkpoints.length}</div>
        </Card>
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-panel border border-border bg-surface-subtle p-3">
      <div className="text-[11px] uppercase tracking-[0.08em] text-text-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold text-text-primary">{value}</div>
    </div>
  );
}
