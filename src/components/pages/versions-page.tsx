"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Badge, Button, Card, EmptyState, Field, PageHeader, PageSkeleton, ProtocolVersionBadge, SectionHeader, StatusBadge, textareaClass, inputClass } from "@/components/ui/primitives";
import { createDraftFromRelease, getProtocolDefinitionApi, getProtocolReleaseApi, getProtocolReleasesApi, getReleaseDiff, publishProtocolRelease, runProtocolValidation, upsertProtocolDefinition } from "@/lib/api/protocol-api";
import type { ProtocolDefinition } from "@/types/protocol-runtime";

export function VersionsPage() {
  const releasesQuery = useQuery({ queryKey: ["protocol-releases"], queryFn: () => getProtocolReleasesApi("TBCT-BR-001") });
  const definitionQuery = useQuery({ queryKey: ["protocol-definition", "TBCT-BR-001"], queryFn: () => getProtocolDefinitionApi("TBCT-BR-001") });
  const validationQuery = useQuery({ queryKey: ["protocol-graph-validation"], queryFn: () => runProtocolValidation(), staleTime: 0, refetchOnMount: "always", refetchOnWindowFocus: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [releaseNotes, setReleaseNotes] = useState("Pilot demo release for international research review.");
  const [nextDraftVersion, setNextDraftVersion] = useState("0.4.1");
  const [lastPublishError, setLastPublishError] = useState<string>("");
  const [definitionForm, setDefinitionForm] = useState<Partial<ProtocolDefinition>>({});

  const buildPublishBlockerMessage = (issues: Array<{ severity: string; message: string; category: string }>) => {
    const criticalIssues = issues.filter((issue) => issue.severity === "critical");
    if (!criticalIssues.length) return "";
    const summary = criticalIssues.slice(0, 3).map((issue) => `${issue.category}: ${issue.message}`).join(" | ");
    return `Publish blocked: ${summary}${criticalIssues.length > 3 ? ` | +${criticalIssues.length - 3} more` : ""}`;
  };
  const selected = releasesQuery.data?.[selectedIndex];
  const selectedReleaseQuery = useQuery({
    queryKey: ["protocol-release-detail", selected?.id],
    queryFn: () => getProtocolReleaseApi(selected?.id ?? ""),
    enabled: Boolean(selected?.id),
  });
  const diffQuery = useQuery({
    queryKey: ["protocol-release-diff", releasesQuery.data?.[1]?.id, selected?.id],
    queryFn: () => getReleaseDiff(releasesQuery.data?.[1]?.id ?? "", selected?.id ?? ""),
    enabled: Boolean(selected?.id && releasesQuery.data && releasesQuery.data.length > 1),
  });
  const publishMutation = useMutation({
    mutationFn: async () => {
      setLastPublishError("");
      await upsertProtocolDefinition("TBCT-BR-001", definitionForm);
      const validation = await runProtocolValidation();
      const blockerMessage = buildPublishBlockerMessage(validation.issues);
      if (blockerMessage) throw new Error(blockerMessage);
      return publishProtocolRelease("TBCT-BR-001", { version: "0.4.0", targetEnvironment: "pilot", changeSummary: releaseNotes });
    },
    onSuccess: async () => {
      toast.success("Release published", {
        description: "A new immutable release snapshot was created and added to the release list.",
      });
      await releasesQuery.refetch();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown publish error";
      setLastPublishError(message);
      toast.error("Publish failed", {
        description: message,
      });
    },
  });
  const newDraftMutation = useMutation({
    mutationFn: () => createDraftFromRelease(selected!.id, { version: nextDraftVersion, changeSummary: "New draft from published release" }),
  });
  const saveDefinitionMutation = useMutation({
    mutationFn: () => upsertProtocolDefinition("TBCT-BR-001", definitionForm),
    onSuccess: async () => {
      toast.success("Protocol definition saved");
      await definitionQuery.refetch();
      await validationQuery.refetch();
    },
    onError: () => toast.error("Protocol definition save failed"),
  });

  useEffect(() => {
    if (definitionQuery.data) setDefinitionForm(definitionQuery.data);
  }, [definitionQuery.data]);

  if (releasesQuery.isLoading) return <AppShell><PageSkeleton /></AppShell>;

  const releases = releasesQuery.data ?? [];
  const detail = selectedReleaseQuery.data;
  const snapshot = detail?.release.immutableSnapshot;
  const hasPublished = releases.length > 0;
  const diff = diffQuery.data;
  const validation = validationQuery.data;
  const validationSummary = validation?.summary;
  const publishReady = Boolean(validationSummary && validationSummary.critical === 0);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Release Management"
        title="Versions & Releases"
        description="Local protocol releases, immutable snapshots, publish gating, and draft-from-release are connected to the editor."
        meta={<><Badge tone="primary">{releases.length} releases</Badge><Badge tone="warning">{hasPublished ? "Snapshots available" : "No published release"}</Badge></>}
        actions={<Button onClick={() => publishMutation.mutate()} loading={publishMutation.isPending}>Publish current draft</Button>}
      />
      <div className="p-4 lg:p-6">
        <Card className="mb-4 overflow-hidden border-warning/20 bg-warning/10">
          <div className="p-4">
            <div className="text-sm font-semibold text-text-primary">Publish note</div>
            <div className="mt-1 text-sm text-text-secondary">
              Publishing only works when validation passes and the current protocol graph is ready. If publish fails, the error message will now tell you what is missing.
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="rounded-panel border border-border bg-surface p-3 text-sm">
                <div className="text-xs uppercase tracking-[0.08em] text-text-muted">Validation</div>
                <div className="mt-1 font-semibold text-text-primary">{validationSummary ? `${validationSummary.critical} critical` : "Loading..."}</div>
              </div>
              <div className="rounded-panel border border-border bg-surface p-3 text-sm">
                <div className="text-xs uppercase tracking-[0.08em] text-text-muted">Ready to publish</div>
                <div className="mt-1 font-semibold text-text-primary">{publishReady ? "Yes" : "No"}</div>
              </div>
              <div className="rounded-panel border border-border bg-surface p-3 text-sm">
                <div className="text-xs uppercase tracking-[0.08em] text-text-muted">Last error</div>
                <div className="mt-1 font-semibold text-text-primary">{lastPublishError || "None"}</div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="mb-4 overflow-hidden">
          <SectionHeader title="Protocol Definition" description="Edit the shared definition used by publishing, runtime sessions, and editor validation." />
          <div className="grid gap-4 p-4 lg:grid-cols-3">
            <Field label="Title">
              <input className={inputClass} value={definitionForm.title ?? ""} onChange={(event) => setDefinitionForm((current) => ({ ...current, title: event.target.value }))} />
            </Field>
            <Field label="Current version">
              <input className={inputClass} value={definitionForm.currentVersion ?? ""} onChange={(event) => setDefinitionForm((current) => ({ ...current, currentVersion: event.target.value }))} />
            </Field>
            <Field label="Status">
              <select className={inputClass} value={definitionForm.status ?? "draft"} onChange={(event) => setDefinitionForm((current) => ({ ...current, status: event.target.value as ProtocolDefinition["status"] }))}>
                <option value="draft">draft</option>
                <option value="clinical_review">clinical_review</option>
                <option value="validated">validated</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </select>
            </Field>
          </div>
          <div className="px-4 pb-4">
            <Button loading={saveDefinitionMutation.isPending} onClick={() => saveDefinitionMutation.mutate()}>Save definition</Button>
          </div>
        </Card>

        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
          <Card className="overflow-hidden">
            <SectionHeader title="Release List" description="Published immutable snapshots stored in IndexedDB." />
            <div className="space-y-2 p-3">
              {releases.map((release, index) => (
                <button key={release.id} onClick={() => setSelectedIndex(index)} className={`w-full rounded-panel border p-3 text-left ${selectedIndex === index ? "border-clinical-blue bg-clinical-blue-light" : "border-border hover:bg-surface-subtle"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <ProtocolVersionBadge version={release.version} />
                    <StatusBadge status="published" />
                  </div>
                  <div className="mt-2 text-sm font-semibold text-text-primary">{release.publishedBy}</div>
                  <div className="mt-1 text-xs text-text-secondary">{release.publishedAt}</div>
                </button>
              ))}
              {!releases.length && <EmptyState title="No published releases" description="Publish from Protocol Editor or from this page after validation." />}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <SectionHeader title="Release Detail" description="Snapshot, manifest metadata, and release diff." />
            {selected && snapshot ? (
              <div className="space-y-4 p-4">
                <div className="flex flex-wrap gap-2">
                  <ProtocolVersionBadge version={selected.version} />
                  <Badge tone="success">{detail?.package?.targetEnvironment ?? "pilot"}</Badge>
                  <Badge tone="neutral">{detail?.package?.packageChecksum.slice(0, 12) ?? "checksum"}</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Metric label="Nodes" value={`${snapshot.nodes.length}`} />
                  <Metric label="Edges" value={`${snapshot.edges.length}`} />
                  <Metric label="Safety hooks" value={`${snapshot.nodes.reduce((sum, node) => sum + node.data.safetyRuleIds.length, 0)}`} />
                  <Metric label="Evidence links" value={`${snapshot.nodes.reduce((sum, node) => sum + node.data.sourceEvidenceIds.length, 0)}`} />
                </div>
                {diff && (
                  <div className="rounded-panel border border-border p-3">
                    <div className="text-sm font-semibold text-text-primary">Release Diff</div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <Metric label="Added nodes" value={`${diff.addedNodes.length}`} />
                      <Metric label="Removed nodes" value={`${diff.removedNodes.length}`} />
                      <Metric label="Modified nodes" value={`${diff.modifiedNodes.length}`} />
                      <Metric label="Modified edges" value={`${diff.modifiedEdges.length}`} />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState title="No release selected" description="Choose a release from the left list." />
            )}
          </Card>

          <Card className="overflow-hidden">
            <SectionHeader title="Draft From Release" description="Published releases remain immutable. New work starts from a new draft version." />
            <div className="space-y-4 p-4">
              <Field label="Base release">
                <input value={selected?.version ?? ""} readOnly className={inputClass} />
              </Field>
              <Field label="New version">
                <input value={nextDraftVersion} onChange={(event) => setNextDraftVersion(event.target.value)} className={inputClass} />
              </Field>
              <Field label="Change summary">
                <textarea value={releaseNotes} onChange={(event) => setReleaseNotes(event.target.value)} className={textareaClass} />
              </Field>
              <Button disabled={!selected} loading={newDraftMutation.isPending} onClick={() => selected && newDraftMutation.mutate()}>Create new draft version</Button>
            </div>
          </Card>
        </div>
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
