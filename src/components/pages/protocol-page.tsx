"use client";

import { getPromptValidationWarnings, getSessionCommonRules, getSessionPrompts, movePromptItem, restorePromptItemFromVerbatim, savePromptItems, saveSessionCommonRules, sessionCatalog, togglePromptItemStatus, updatePromptItem } from "@/lib/session-catalog";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import { CheckCircle2, Copy, Download, Link2, PlayCircle, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  PageSkeleton,
  SaveStatus,
  SectionHeader,
  SourceReferenceChip,
  StatusBadge,
  ValidationSeverityBadge,
  inputClass,
  textareaClass,
} from "@/components/ui/primitives";
import { fadeIn, fadeScale, fadeUp, highlightPulse, logItemEnter, runtimeStepEnter, safetyNoticeEnter, statusTransition } from "@/lib/motion/motion-variants";
import { useReducedMotionPreference } from "@/lib/motion/use-reduced-motion-preference";
import {
  attachSafetyRuleToNode,
  createDraftFromRelease,
  createProtocolEdge,
  createProtocolNode,
  deleteProtocolEdge,
  deleteProtocolNode,
  downloadProtocolReleasePackage,
  duplicateProtocolNode,
  getProtocolDefinitionApi,
  getProtocolGraphApi,
  getSafetyRulesApi,
  importProtocolDraftCandidate,
  previewCandidateImport,
  publishProtocolRelease,
  runProtocolValidation,
  upsertProtocolDefinition,
  runRuntimeScenario,
  updateProtocolNodeApi,
} from "@/lib/api/protocol-api";
import { getClinicalAssetsApi, getExtractionReviewDraftApi, getProtocolDraftCandidateBySourceDraftIdApi } from "@/lib/api/clinical-assets-api";
import { cn } from "@/lib/utils";
import type { ProtocolDraftItem } from "@/types/clinical-assets";
import type { LocalClinicalAsset, SourceEvidence } from "@/types/clinical-assets";
import type { ProtocolDefinition } from "@/types/protocol-runtime";
import type { ProtocolGraphEdge, ProtocolGraphNode, ProtocolNodeType, RuntimeExecutionLog } from "@/types/protocol-runtime";

type FlowNode = Node<{ step: ProtocolGraphNode }>;

const nodeTypeOptions: ProtocolNodeType[] = [
  "session_start",
  "orientation",
  "dialogue",
  "question",
  "assessment",
  "condition",
  "activity",
  "visualization",
  "homework",
  "safety_check",
  "clinician_escalation",
  "session_complete",
];

function nodeTone(status: ProtocolGraphNode["data"]["status"]) {
  if (status === "approved") return "border-clinical-blue";
  if (status === "needs_review") return "border-warning";
  if (status === "validation_error") return "border-critical";
  if (status === "published") return "border-success";
  return "border-border-strong";
}

function toNodes(steps: ProtocolGraphNode[]): FlowNode[] {
  return steps.map((step) => ({ id: step.id, type: "protocolNode", position: step.position, data: { step } }));
}

function toEdges(edges: ProtocolGraphEdge[]): Edge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed },
  }));
}

function ProtocolNodeView({ data, selected }: NodeProps<FlowNode>) {
  const step = data.step;
  return (
    <div className={cn("relative min-w-[230px] rounded-panel border bg-surface px-4 py-3", nodeTone(step.data.status), selected && "ring-2 ring-clinical-blue-light") }>
      <div className="pointer-events-none absolute left-1/2 top-[-18px] -translate-x-1/2 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Connect here</div>
      <Handle
        type="target"
        position={Position.Top}
        className="!h-4 !w-4 !border-2 !border-white !bg-clinical-blue !shadow-md"
        style={{ top: -8 }}
      />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{step.type}</Badge>
            <StatusBadge status={step.data.status === "needs_review" ? "review" : step.data.status === "validation_error" ? "error" : step.data.status === "published" ? "published" : "draft"} />
            {step.data.required && <Badge tone="primary">Required</Badge>}
          </div>
          <div className="mono mt-3 text-[11px] font-semibold text-text-muted">{step.data.protocolNodeId}</div>
          <div className="mt-1 text-sm font-semibold text-text-primary">{step.data.title}</div>
          <div className="mt-1 truncate-2 text-xs leading-5 text-text-secondary">{step.data.clinicalIntent}</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
        <MetaPill label="Sources" value={`${step.data.sourceEvidenceIds.length}`} />
        <MetaPill label="Safety" value={`${step.data.safetyRuleIds.length}`} />
        <MetaPill label="Links" value={`${step.data.sourceStructuredItemIds.length}`} />
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-4 !w-4 !border-2 !border-white !bg-ai-violet !shadow-md"
        style={{ bottom: -8 }}
      />
    </div>
  );
}

const protocolNodeTypes = { protocolNode: ProtocolNodeView };

export function ProtocolPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const candidateId = searchParams.get("candidate");
  const manualId = searchParams.get("asset");
  const issueId = searchParams.get("issue");
  const issueNodeId = searchParams.get("node");
  const focusField = searchParams.get("focus");
  const selectedSessionId = searchParams.get("sessionId") ?? searchParams.get("session") ?? "tbct-session-03";
  const [selectedStepId, setSelectedStepId] = useState<string>("");
  const [selectedPromptItemId, setSelectedPromptItemId] = useState<string>("");
  const [inspectorTab, setInspectorTab] = useState<"prompt" | "flow" | "data" | "safety" | "qa">("prompt");
  const [runtimeState, setRuntimeState] = useState<{ currentSessionPlanEntryId: string; currentSessionId: string; currentNodeId: string; currentPromptItemId: string; completedPromptItemIds: string[]; completedNodeIds: string[]; fields: Record<string, string>; status: string; safetyStatus: string; updatedAt: string } | null>(null);
  const [runtimeInput, setRuntimeInput] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [runtimeLog, setRuntimeLog] = useState<RuntimeExecutionLog | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [createNodeOpen, setCreateNodeOpen] = useState(false);
  const [releaseDraftOpen, setReleaseDraftOpen] = useState(false);
  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([]);
  const [definitionForm, setDefinitionForm] = useState<Partial<ProtocolDefinition>>({});
  const [newNodeForm, setNewNodeForm] = useState({ nodeType: "dialogue" as ProtocolNodeType, title: "", clinicalIntent: "", content: "" });
  const [publishForm, setPublishForm] = useState({ version: "0.4.0", targetEnvironment: "pilot" as const, changeSummary: "Clinical graph import and validation" });
  const [newDraftForm, setNewDraftForm] = useState({ version: "0.4.1", changeSummary: "Continue from published release" });
  const reducedMotion = useReducedMotionPreference();

  const logProtocolAction = (action: string, details: Record<string, unknown>) => {
    console.log(`[Protocol Editor] ${action}`, details);
  };

  const graphQuery = useQuery({ queryKey: ["protocol-graph", selectedSessionId], queryFn: () => getProtocolGraphApi("TBCT-BR-001", selectedSessionId) });
  const definitionQuery = useQuery({ queryKey: ["protocol-definition", "TBCT-BR-001"], queryFn: () => getProtocolDefinitionApi("TBCT-BR-001") });
  const manualsQuery = useQuery({ queryKey: ["protocol-manual-assets"], queryFn: () => getClinicalAssetsApi({}) });
  const selectedManual = manualsQuery.data?.find((asset: LocalClinicalAsset) => asset.id === manualId) ?? manualsQuery.data?.find((asset: LocalClinicalAsset) => asset.extractionDraftId) ?? null;
  const evidenceDraftQuery = useQuery({
    queryKey: ["protocol-manual-evidence", selectedManual?.extractionDraftId],
    queryFn: () => getExtractionReviewDraftApi(selectedManual?.extractionDraftId ?? ""),
    enabled: Boolean(selectedManual?.extractionDraftId),
  });
  const selectedCandidateQuery = useQuery({
    queryKey: ["protocol-candidate-by-draft", selectedManual?.extractionDraftId],
    queryFn: () => getProtocolDraftCandidateBySourceDraftIdApi(selectedManual?.extractionDraftId ?? ""),
    enabled: Boolean(selectedManual?.extractionDraftId),
  });
  const previewQuery = useQuery({
    queryKey: ["protocol-import-preview", candidateId, selectedCandidateQuery.data?.id],
    queryFn: () => previewCandidateImport(candidateId ?? selectedCandidateQuery.data?.id ?? ""),
    enabled: Boolean(candidateId || selectedCandidateQuery.data?.id),
  });
  const safetyRulesQuery = useQuery({ queryKey: ["safety-rules-live"], queryFn: () => getSafetyRulesApi({ active: true }) });

  const selectedNode = graphQuery.data?.nodes.find((item) => item.id === selectedStepId) ?? graphQuery.data?.nodes[0] ?? null;
  const [draft, setDraft] = useState<ProtocolGraphNode | null>(null);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState("");
  const selectedIssue = graphQuery.data?.validationRun?.issues.find((issue) => issue.id === issueId) ?? null;
  const shouldFocusSourceEvidence = focusField === "source-evidence" && issueNodeId && issueId && selectedIssue?.category === "Source Traceability";

  useEffect(() => {
    if (candidateId && previewQuery.data) setImportPreviewOpen(true);
  }, [candidateId, previewQuery.data]);

  useEffect(() => {
    if (issueNodeId && graphQuery.data?.nodes.some((node) => node.id === issueNodeId)) {
      setSelectedStepId(issueNodeId);
      return;
    }
    if (selectedNode) {
      setSelectedStepId(selectedNode.id);
      setDraft(selectedNode);
    }
  }, [graphQuery.data?.nodes, issueNodeId, selectedNode]);

  useEffect(() => {
    if (selectedNode) setDraft(selectedNode);
  }, [selectedNode]);

  useEffect(() => {
    if (shouldFocusSourceEvidence) {
      const target = document.getElementById("protocol-source-evidence-field");
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [shouldFocusSourceEvidence]);

  const refreshGraph = async () => {
    await queryClient.invalidateQueries({ queryKey: ["protocol-graph", selectedSessionId] });
    await queryClient.invalidateQueries({ queryKey: ["protocol-graph-validation", selectedSessionId] });
    await queryClient.refetchQueries({ queryKey: ["protocol-graph-validation", selectedSessionId] });
    await queryClient.invalidateQueries({ queryKey: ["protocol-manual-evidence", selectedManual?.extractionDraftId] });
  };

  const attachEvidenceMutation = useMutation({
    mutationFn: () => {
      if (!draft || !selectedEvidenceId) throw new Error("Select evidence first");
      return updateProtocolNodeApi(draft.id, {
        data: {
          ...draft.data,
          sourceEvidenceIds: [...new Set([...draft.data.sourceEvidenceIds, selectedEvidenceId])],
          metadata: { ...draft.data.metadata, updatedBy: "Demo User", updatedAt: new Date().toISOString() },
        },
      });
    },
    onSuccess: async () => {
      setSelectedEvidenceId("");
      toast.success("Source evidence attached");
      await validationMutation.mutateAsync();
      await refreshGraph();
    },
    onError: () => toast.error("Failed to attach evidence"),
  });

  const importMutation = useMutation({
    mutationFn: () => importProtocolDraftCandidate(candidateId ?? selectedCandidateQuery.data?.id ?? ""),
    onSuccess: async () => {
      logProtocolAction("candidate import success", { candidateId, protocolId: "TBCT-BR-001", sessionId: selectedSessionId });
      setImportPreviewOpen(false);
      toast.success("Candidate import completed");
      await refreshGraph();
    },
    onError: (error: unknown) => {
      logProtocolAction("candidate import failed", { candidateId, error: String(error) });
      toast.error("Candidate import failed");
    },
  });

  const validationMutation = useMutation({
    mutationFn: () => runProtocolValidation("TBCT-BR-001", selectedSessionId),
    onMutate: () => {
      logProtocolAction("validation start", {
        protocolId: "TBCT-BR-001",
        sessionId: selectedSessionId,
        nodeCount: graphQuery.data?.nodes.length ?? 0,
        edgeCount: graphQuery.data?.edges.length ?? 0,
      });
    },
    onSuccess: async () => {
      const summary = graphQuery.data?.validationRun?.summary;
      logProtocolAction("validation success", {
        protocolId: "TBCT-BR-001",
        sessionId: selectedSessionId,
        critical: summary?.critical ?? 0,
        warning: summary?.warning ?? 0,
        information: summary?.information ?? 0,
      });
      toast.success("Protocol validation completed");
      await refreshGraph();
    },
    onError: (error: unknown) => {
      logProtocolAction("validation failed", {
        protocolId: "TBCT-BR-001",
        sessionId: selectedSessionId,
        error: String(error),
      });
      toast.error("Protocol validation failed");
    },
  });

  const runtimeMutation = useMutation({
    mutationFn: () => runRuntimeScenario("TBCT-BR-001", selectedSessionId),
    onSuccess: (result) => {
      setRuntimeLog(result);
      toast.success("Runtime preview completed");
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!immutableSourceView) await upsertProtocolDefinition("TBCT-BR-001", definitionForm);
      const validation = await runProtocolValidation();
      const criticalIssues = validation.issues.filter((issue) => issue.severity === "critical");
      if (criticalIssues.length) {
        const message = criticalIssues.slice(0, 3).map((issue) => `${issue.category}: ${issue.message}`).join(" | ");
        throw new Error(`Publish blocked: ${message}${criticalIssues.length > 3 ? ` | +${criticalIssues.length - 3} more` : ""}`);
      }
      return publishProtocolRelease("TBCT-BR-001", publishForm);
    },
    onSuccess: async () => {
      setPublishOpen(false);
      toast.success("Release published");
      await refreshGraph();
    },
  });

  const createNodeMutation = useMutation({
    mutationFn: () =>
      createProtocolNode({
        protocolId: "TBCT-BR-001",
        sessionId: selectedSessionId,
        nodeType: newNodeForm.nodeType,
        title: newNodeForm.title || "New Node",
        clinicalIntent: newNodeForm.clinicalIntent,
        content: newNodeForm.content,
        reason: "Manual node creation",
      }),
    onSuccess: async () => {
      logProtocolAction("create node success", {
        protocolId: "TBCT-BR-001",
        sessionId: selectedSessionId,
        nodeType: newNodeForm.nodeType,
        title: newNodeForm.title || "New Node",
      });
      setCreateNodeOpen(false);
      setNewNodeForm({ nodeType: "dialogue", title: "", clinicalIntent: "", content: "" });
      toast.success("Protocol node created");
      await refreshGraph();
    },
    onError: (error: unknown) => {
      logProtocolAction("create node failed", {
        protocolId: "TBCT-BR-001",
        sessionId: selectedSessionId,
        nodeType: newNodeForm.nodeType,
        title: newNodeForm.title || "New Node",
        error: String(error),
      });
      toast.error("Protocol node creation failed");
    },
  });

  const saveNodeMutation = useMutation({
    mutationFn: (node: ProtocolGraphNode) =>
      updateProtocolNodeApi(node.id, {
        position: node.position,
        data: {
          ...node.data,
          metadata: { ...node.data.metadata, updatedBy: "Demo User", updatedAt: new Date().toISOString() },
        },
      }),
    onSuccess: async () => {
      setSaveState("saved");
      toast.success("Node saved");
      await refreshGraph();
    },
    onError: () => {
      setSaveState("error");
      toast.error("Node save failed");
    },
  });

  const saveDefinitionMutation = useMutation({
    mutationFn: () => upsertProtocolDefinition("TBCT-BR-001", definitionForm),
    onSuccess: async () => {
      toast.success("Protocol definition saved");
      await queryClient.invalidateQueries({ queryKey: ["protocol-definition", "TBCT-BR-001"] });
      await refreshGraph();
    },
    onError: () => toast.error("Protocol definition save failed"),
  });

  const duplicateNodeMutation = useMutation({
    mutationFn: (nodeId: string) => duplicateProtocolNode(nodeId, { keepSourceEvidence: true }),
    onSuccess: async () => {
      toast.success("Node duplicated");
      await refreshGraph();
    },
  });

  const deleteNodeMutation = useMutation({
    mutationFn: (nodeId: string) => deleteProtocolNode(nodeId, { reason: "Delete node from canvas" }),
    onSuccess: async () => {
      setSelectedStepId("");
      toast.success("Node deleted");
      await refreshGraph();
    },
  });

  const createEdgeMutation = useMutation({
    mutationFn: (connection: Connection) =>
      createProtocolEdge({
        protocolId: "TBCT-BR-001",
        sessionId: selectedSessionId,
        source: connection.source ?? "",
        target: connection.target ?? "",
        edgeType: "default",
        priority: 1,
        reason: "React Flow connect",
      }),
    onSuccess: async () => {
      toast.success("Edge created");
      await refreshGraph();
    },
  });

  const deleteEdgeMutation = useMutation({
    mutationFn: (edgeId: string) => deleteProtocolEdge(edgeId),
    onSuccess: async () => {
      toast.success("Edge deleted");
      await refreshGraph();
    },
  });

  const attachSafetyMutation = useMutation({
    mutationFn: ({ nodeId, ruleId }: { nodeId: string; ruleId: string }) => attachSafetyRuleToNode(nodeId, ruleId, "Linked in protocol editor"),
    onSuccess: async () => {
      toast.warning("Safety rule attached");
      await refreshGraph();
    },
  });

  const newDraftMutation = useMutation({
    mutationFn: (releaseId: string) => createDraftFromRelease(releaseId, newDraftForm),
    onSuccess: async () => {
      setReleaseDraftOpen(false);
      toast.success("New draft created from published release");
      await refreshGraph();
    },
  });

  const nodes = useMemo(() => toNodes(graphQuery.data?.nodes ?? []), [graphQuery.data?.nodes]);
  const edges = useMemo(() => toEdges(graphQuery.data?.edges ?? []), [graphQuery.data?.edges]);
  const availableEvidence = (evidenceDraftQuery.data?.evidence ?? []) as SourceEvidence[];
  const validationRun = graphQuery.data?.validationRun;
  const releases = graphQuery.data?.releases ?? [];
  const selectedSessionMeta = sessionCatalog.find((session) => session.id === graphQuery.data?.session.id)
    ?? sessionCatalog.find((session) => session.id === selectedSessionId)
    ?? sessionCatalog[0];
  const sessionFlowNodes = nodes;
  const sessionFlowEdges = edges;
  const immutableSourceView = graphQuery.data?.definition?.id === "tbct-br-001";
  const selectedSessionNode = useMemo(() => sessionFlowNodes.find((item) => item.id === selectedStepId) ?? sessionFlowNodes[0] ?? null, [sessionFlowNodes, selectedStepId]);
  const sessionPrompts = useMemo(() => getSessionPrompts(selectedSessionMeta.id, selectedSessionNode?.id), [selectedSessionMeta.id, selectedSessionNode?.id]);
  const selectedPromptItem = sessionPrompts.find((item) => item.id === selectedPromptItemId) ?? sessionPrompts[0] ?? null;
  const sessionCommonRules = getSessionCommonRules(selectedSessionMeta.id);

  useEffect(() => {
    setFlowNodes(sessionFlowNodes);
  }, [sessionFlowNodes]);

  useEffect(() => {
    if (selectedPromptItem?.id) setSelectedPromptItemId(selectedPromptItem.id);
  }, [selectedPromptItem?.id]);

  useEffect(() => {
    if (definitionQuery.data) setDefinitionForm(definitionQuery.data);
  }, [definitionQuery.data]);

  useEffect(() => {
    if (!selectedSessionNode || !selectedPromptItem) return;
    setRuntimeState((current) => current?.currentSessionId === selectedSessionMeta.id
      ? current
      : {
          currentSessionPlanEntryId: `${selectedSessionMeta.id}-entry`,
          currentSessionId: selectedSessionMeta.id,
          currentNodeId: selectedSessionNode.id,
          currentPromptItemId: selectedPromptItem.id,
          completedPromptItemIds: [],
          completedNodeIds: [],
          fields: {},
          status: "ready",
          safetyStatus: "clear",
          updatedAt: new Date().toISOString(),
        });
  }, [selectedPromptItem, selectedSessionMeta.id, selectedSessionNode]);

  if (graphQuery.isLoading) return <AppShell><PageSkeleton /></AppShell>;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Protocol Authoring IDE"
        title="Session Builder"
        description="The existing graph editor is now framed as a session builder while keeping candidate import, validation, runtime preview, and release publish intact."
        meta={
          <>
            <Badge tone="primary">TBCT-BR-001</Badge>
            <Badge tone="neutral">{selectedSessionMeta?.id ?? selectedSessionId}</Badge>
            <Badge tone="neutral">{graphQuery.data?.definition?.status ?? "draft"}</Badge>
            {issueId && <Badge tone="warning">Issue {issueId}</Badge>}
            <SaveStatus state={saveState} />
          </>
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => router.push(`/projects/demo/extraction?tab=session-flow`)}>Back to Session Flow</Button>
            <div className="flex flex-col gap-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">Session</div>
              <div className="flex items-center gap-2">
                <select
                  className={inputClass}
                  value={selectedSessionMeta?.id ?? selectedSessionId}
                  onChange={(event) => router.push(`/projects/demo/protocols/tbct-br-001/canvas?sessionId=${event.target.value}${candidateId ? `&candidate=${candidateId}` : ""}${manualId ? `&asset=${manualId}` : ""}`)}
                >
                  {sessionCatalog.map((session) => (
                    <option key={session.id} value={session.id}>{session.number.toString().padStart(2, "0")} · {session.title}</option>
                  ))}
                </select>
                <Badge tone="primary">{selectedSessionMeta?.id ?? selectedSessionId}</Badge>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">Manual</div>
              <select
                className={inputClass}
                value={selectedManual?.id ?? ""}
                onChange={(event) => {
                  const manual = manualsQuery.data?.find((asset: LocalClinicalAsset) => asset.id === event.target.value);
                  if (!manual) return;
                  router.push(`/projects/demo/protocols/tbct-br-001/canvas${manual.extractionDraftId ? `?asset=${manual.id}` : ""}`);
                }}
              >
                <option value="">Select manual</option>
                {(manualsQuery.data ?? []).filter((asset: LocalClinicalAsset) => asset.protocolId || asset.assetType === "therapist_manual").map((asset: LocalClinicalAsset) => (
                  <option key={asset.id} value={asset.id}>{asset.title}</option>
                ))}
              </select>
            </div>
            <Button variant="secondary" onClick={() => setCreateNodeOpen(true)} disabled={immutableSourceView}><Plus className="h-4 w-4" />New node</Button>
            <Button variant="secondary" onClick={() => validationMutation.mutate()}><CheckCircle2 className="h-4 w-4" />Validation</Button>
            <Button variant="secondary" onClick={() => runtimeMutation.mutate()}><PlayCircle className="h-4 w-4" />Runtime preview</Button>
            <Button onClick={() => setPublishOpen(true)}><ShieldCheck className="h-4 w-4" />Publish</Button>
          </>
        }
      />

      <div className="p-4 lg:p-6">
        <motion.div className="mb-4 grid gap-4 lg:grid-cols-4" variants={reducedMotion ? undefined : fadeIn} initial={reducedMotion ? false : "initial"} animate={reducedMotion ? undefined : "animate"}>
          <MetaCard label="Nodes" value={`${graphQuery.data?.nodes.length ?? 0}`} />
          <MetaCard label="Edges" value={`${graphQuery.data?.edges.length ?? 0}`} />
          <MetaCard label="Critical" value={`${validationRun?.summary.critical ?? 0}`} />
          <MetaCard label="Releases" value={`${releases.length}`} />
        </motion.div>

        {previewQuery.data && (
          <Card className="mb-4">
            <SectionHeader title="Candidate Import Ready" description="Approved Extraction Review items are ready to enter the protocol graph." action={<Button size="sm" onClick={() => setImportPreviewOpen(true)}>Import preview</Button>} />
            <div className="grid gap-4 p-4 lg:grid-cols-4">
              <MetaPill label="Candidate" value={previewQuery.data.candidate.id} />
              <MetaPill label="Items" value={`${previewQuery.data.candidate.items.length}`} />
              <MetaPill label="Warnings" value={`${previewQuery.data.warnings.length}`} />
              <MetaPill label="Conflicts" value={`${previewQuery.data.conflictIds.length}`} />
            </div>
          </Card>
        )}

        <Card className="mb-4 overflow-hidden">
          <SectionHeader title="Session Builder Summary" description="This keeps the current editor shell but surfaces the selected session as the unit of work." action={<Badge tone="neutral">{selectedSessionMeta?.title ?? "Selected session"}</Badge>} />
          <div className="grid gap-3 border-t border-border p-4 md:grid-cols-4">
            <div className="rounded-panel border border-border bg-surface-subtle p-3"><div className="text-xs uppercase tracking-[0.14em] text-text-secondary">Technique</div><div className="mt-1 text-sm font-semibold text-text-primary">{selectedSessionMeta?.technique ?? "Unknown"}</div></div>
            <div className="rounded-panel border border-border bg-surface-subtle p-3"><div className="text-xs uppercase tracking-[0.14em] text-text-secondary">Nodes</div><div className="mt-1 text-sm font-semibold text-text-primary">{selectedSessionMeta?.nodeCount ?? 0}</div></div>
            <div className="rounded-panel border border-border bg-surface-subtle p-3"><div className="text-xs uppercase tracking-[0.14em] text-text-secondary">Prompts</div><div className="mt-1 text-sm font-semibold text-text-primary">{selectedSessionMeta?.promptCount ?? 0}</div></div>
            <div className="rounded-panel border border-border bg-surface-subtle p-3"><div className="text-xs uppercase tracking-[0.14em] text-text-secondary">Status</div><div className="mt-1 text-sm font-semibold text-text-primary">{selectedSessionMeta?.validationStatus ?? "review"}</div></div>
          </div>
        </Card>

        <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_360px]">
          <Card className="overflow-hidden">
            <SectionHeader title="Session Explorer" description="Current session nodes" action={<Badge tone="neutral">{selectedSessionMeta.title}</Badge>} />
            <div className="max-h-[calc(100vh-330px)] space-y-2 overflow-auto p-3">
              {sessionFlowNodes.map((step) => (
                <motion.button key={step.id} layout={!reducedMotion} variants={reducedMotion ? undefined : fadeUp} initial={reducedMotion ? false : "initial"} animate={reducedMotion ? undefined : "animate"} onClick={() => setSelectedStepId(step.id)} className={`w-full rounded-panel border p-3 text-left ${selectedStepId === step.id ? "border-clinical-blue bg-clinical-blue-light" : "border-border hover:bg-surface-subtle"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-text-primary">{step.data.step.data.title}</div>
                    <StatusBadge status={step.data.step.data.status === "needs_review" ? "review" : step.data.step.data.status === "validation_error" ? "error" : step.data.step.data.status === "published" ? "published" : "draft"} />
                  </div>
                  <div className="mono mt-1 text-[11px] text-text-muted">{step.data.step.data.protocolNodeId}</div>
                  <div className="mt-2 text-xs text-text-secondary">{step.data.step.data.clinicalIntent}</div>
                </motion.button>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <SectionHeader title="Protocol Canvas" description="onConnect calls real edge create API. Double click an edge to delete it." />
            <div className="border-b border-warning/30 bg-warning/10 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-warning-foreground/80">{immutableSourceView ? "Source fidelity view" : "Editor tip"}</div>
              <div className="mt-1 text-sm text-text-primary">
                {immutableSourceView ? "Nodes and edges come directly from the immutable source snapshot. Select nodes to inspect their PromptItems and source trace." : "Drag a node to reposition it. The new position is saved on mouse release, then reflected in the session graph after refresh."}
              </div>
            </div>
            <div className="relative h-[calc(100vh-330px)] min-h-[640px] w-full dot-grid">
              <ReactFlowProvider>
                <div className="absolute inset-0 h-full w-full">
                  <ReactFlow
                    className="h-full w-full"
                    style={{ height: "100%", width: "100%" }}
                    nodes={flowNodes}
                    edges={sessionFlowEdges}
                    nodeTypes={protocolNodeTypes}
                    nodesDraggable={!immutableSourceView}
                    nodesConnectable={!immutableSourceView}
                    onNodesChange={(changes: NodeChange[]) => setFlowNodes((currentNodes) => applyNodeChanges(changes, currentNodes) as FlowNode[])}
                    onNodeClick={(_, node) => setSelectedStepId(node.id)}
                    onNodeDragStart={(_, node) => {
                      setSaveState("saving");
                      logProtocolAction("node drag start", { nodeId: node.id, title: node.data.step.data.title, position: node.position });
                    }}
                    onNodeDragStop={(_, node) => {
                      if (immutableSourceView) return;
                      const current = sessionFlowNodes.find((item) => item.id === node.id)?.data.step;
                      if (!current) return;
                      logProtocolAction("node drag stop", { nodeId: node.id, title: current.data.title, from: current.position, to: node.position });
                      void saveNodeMutation.mutate({ ...current, position: node.position });
                    }}
                    onConnect={(connection: Connection) => {
                      if (immutableSourceView) return;
                      if (!connection.source || !connection.target) return;
                      createEdgeMutation.mutate(connection);
                    }}
                    onEdgeDoubleClick={(_, edge) => {
                      if (!immutableSourceView) deleteEdgeMutation.mutate(edge.id);
                    }}
                    fitView
                  >
                    <Background variant={BackgroundVariant.Dots} gap={22} size={1} />
                    <MiniMap className="!bg-surface" pannable zoomable />
                    <Controls position="bottom-left" />
                  </ReactFlow>
                </div>
              </ReactFlowProvider>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <SectionHeader title="Node Inspector" description="Prompt, flow, data, safety, and QA are edited in separate tabs" />
            <div className="border-b border-border bg-surface px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">Selected Node</div>
                  <div className="mt-1 text-sm font-semibold text-text-primary">{selectedSessionNode?.data.step.data.title ?? "Select a node"}</div>
                  <div className="mt-1 text-xs text-text-secondary">{selectedSessionNode?.id ?? "No node selected yet"}</div>
                  {selectedSessionNode?.data.step.data.sourceTrace && (
                    <div className="mt-1 text-xs text-text-secondary">Source lines {selectedSessionNode.data.step.data.sourceTrace.sourceLineStart}-{selectedSessionNode.data.step.data.sourceTrace.sourceLineEnd}</div>
                  )}
                </div>
                <Badge tone="primary">{sessionPrompts.length} prompts</Badge>
              </div>
              <div className="mt-3 space-y-2">
                {sessionPrompts.slice(0, 4).map((promptItem) => (
                  <button
                    key={promptItem.id}
                    type="button"
                    onClick={() => setSelectedPromptItemId(promptItem.id)}
                    className={`w-full rounded-panel border p-3 text-left ${selectedPromptItem?.id === promptItem.id ? "border-clinical-blue bg-clinical-blue-light" : "border-border bg-surface-subtle hover:bg-surface"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-text-primary">{promptItem.order}. {promptItem.type}</div>
                      <Badge tone={promptItem.status === "active" ? "success" : "neutral"}>{promptItem.status}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-text-secondary">{promptItem.editableText.slice(0, 110)}</div>
                  </button>
                ))}
                {!sessionPrompts.length && <EmptyState title="No prompts for this node" description="Select another node or verify the session catalog." />}
              </div>
              {selectedPromptItem && (
                <div className="mt-3 rounded-panel border border-border bg-surface-subtle p-3 text-sm text-text-primary">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">Selected Prompt</div>
                  <div className="mt-1 font-semibold">{selectedPromptItem.id}</div>
                  <div className="mt-1 text-xs text-text-secondary">{selectedPromptItem.verbatimText}</div>
                </div>
              )}
            </div>
            <div className="border-b border-border bg-surface-subtle px-4 py-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">Session Common Rules</div>
              <fieldset disabled={immutableSourceView} className="grid gap-3">
                <Field label="Session Title">
                  <input className={inputClass} value={sessionCommonRules?.sessionTitle ?? ""} onChange={(event) => sessionCommonRules && saveSessionCommonRules(selectedSessionMeta.id, { ...sessionCommonRules, sessionTitle: event.target.value })} />
                </Field>
                <Field label="Technique Name">
                  <input className={inputClass} value={sessionCommonRules?.techniqueName ?? ""} onChange={(event) => sessionCommonRules && saveSessionCommonRules(selectedSessionMeta.id, { ...sessionCommonRules, techniqueName: event.target.value })} />
                </Field>
                <Field label="Role & Stance">
                  <input className={inputClass} value={sessionCommonRules?.roleAndStance ?? ""} onChange={(event) => sessionCommonRules && saveSessionCommonRules(selectedSessionMeta.id, { ...sessionCommonRules, roleAndStance: event.target.value })} />
                </Field>
                <Field label="Session Objective">
                  <textarea className={textareaClass} value={sessionCommonRules?.sessionObjective ?? ""} onChange={(event) => sessionCommonRules && saveSessionCommonRules(selectedSessionMeta.id, { ...sessionCommonRules, sessionObjective: event.target.value })} />
                </Field>
                <Field label="Language & Terminology Rules">
                  <textarea className={textareaClass} value={sessionCommonRules?.languageAndTerminologyRules ?? ""} onChange={(event) => sessionCommonRules && saveSessionCommonRules(selectedSessionMeta.id, { ...sessionCommonRules, languageAndTerminologyRules: event.target.value })} />
                </Field>
                <Field label="Tone & Interaction Rules">
                  <textarea className={textareaClass} value={sessionCommonRules?.toneAndInteractionRules ?? ""} onChange={(event) => sessionCommonRules && saveSessionCommonRules(selectedSessionMeta.id, { ...sessionCommonRules, toneAndInteractionRules: event.target.value })} />
                </Field>
                <Field label="Session-wide Restrictions">
                  <textarea className={textareaClass} value={(sessionCommonRules?.sessionWideRestrictions ?? []).join("\n")} onChange={(event) => sessionCommonRules && saveSessionCommonRules(selectedSessionMeta.id, { ...sessionCommonRules, sessionWideRestrictions: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })} />
                </Field>
                <Field label="Safety & Escalation Rules">
                  <textarea className={textareaClass} value={sessionCommonRules?.safetyAndEscalationRules ?? ""} onChange={(event) => sessionCommonRules && saveSessionCommonRules(selectedSessionMeta.id, { ...sessionCommonRules, safetyAndEscalationRules: event.target.value })} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Session Version">
                    <input className={inputClass} value={sessionCommonRules?.version ?? ""} onChange={(event) => sessionCommonRules && saveSessionCommonRules(selectedSessionMeta.id, { ...sessionCommonRules, version: event.target.value })} />
                  </Field>
                  <Field label="Session Status">
                    <select className={inputClass} value={sessionCommonRules?.status ?? "clinical_review"} onChange={(event) => sessionCommonRules && saveSessionCommonRules(selectedSessionMeta.id, { ...sessionCommonRules, status: event.target.value as typeof sessionCommonRules.status })}>
                      <option value="incomplete">incomplete</option>
                      <option value="clinical_review">clinical_review</option>
                      <option value="safety_review">safety_review</option>
                      <option value="validated">validated</option>
                      <option value="published">published</option>
                    </select>
                  </Field>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => sessionCommonRules && saveSessionCommonRules(selectedSessionMeta.id, sessionCommonRules)}>Save Session Rules</Button>
                  <Button size="sm" variant="secondary" onClick={() => validationMutation.mutate()} loading={validationMutation.isPending}>Validate Session</Button>
                  <Button size="sm" variant="primary" onClick={() => setPublishOpen(true)}>Submit for Clinical Review</Button>
                </div>
              </fieldset>
            </div>
            <div className="border-b border-critical/30 bg-critical/10 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-critical-foreground/80">Validation guide</div>
              <div className="mt-1 text-sm text-text-primary">
                Validation checks the whole graph: start node, complete node, source evidence, runtime action, and branch labels. A critical means the issue blocks release.
              </div>
            </div>
            {!draft ? (
              <EmptyState title="Select a node" description="Choose a node from the session explorer or canvas." />
            ) : (
              <motion.div key={draft.id} className="max-h-[calc(100vh-330px)] space-y-4 overflow-auto p-4" variants={reducedMotion ? undefined : statusTransition} initial={reducedMotion ? false : "initial"} animate={reducedMotion ? undefined : "animate"}>
                <div className="rounded-panel border border-border bg-surface-subtle p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">PromptItems</div>
                  </div>
                  <div className="mt-2 space-y-2">
                    {sessionPrompts.map((promptItem) => {
                      const warnings = getPromptValidationWarnings(promptItem);
                      return (
                      <div key={promptItem.id} className="rounded-panel border border-border bg-surface p-3">
                        <div className="flex items-center justify-between gap-2">
                          <button className="text-left text-sm font-semibold text-text-primary" onClick={() => setSelectedPromptItemId(promptItem.id)}>{promptItem.order}. {promptItem.type}</button>
                          <Badge tone={promptItem.status === "active" ? "success" : "neutral"}>{promptItem.status}</Badge>
                        </div>
                        <div className="mt-1 text-xs text-text-secondary">{promptItem.editableText.slice(0, 120)}</div>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                          <Badge tone={promptItem.editableText === promptItem.verbatimText ? "neutral" : "primary"}>{promptItem.editableText === promptItem.verbatimText ? "Original" : "Modified"}</Badge>
                          <Badge tone={warnings.length ? "warning" : "success"}>{warnings.length ? warnings[0] : "ok"}</Badge>
                          <Badge tone="neutral">{promptItem.sourceTrace.sourceSection}</Badge>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>

                {selectedPromptItem && (
                  <div className="rounded-panel border border-border bg-surface p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-text-primary">{selectedPromptItem.id}</div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" disabled={immutableSourceView} onClick={() => { const next = restorePromptItemFromVerbatim(selectedPromptItem.id); if (next) setSelectedPromptItemId(next.id); }}>Restore from verbatim</Button>
                        <Button size="sm" variant="secondary" disabled={immutableSourceView} onClick={() => { const next = togglePromptItemStatus(selectedPromptItem.id); if (next) setSelectedPromptItemId(next.id); }}>{selectedPromptItem.status === "active" ? "Disable" : "Enable"}</Button>
                        <Button size="sm" variant="secondary" disabled={immutableSourceView} onClick={() => { const next = movePromptItem(selectedPromptItem.id, -1); if (next) setSelectedPromptItemId(next.id); }}>Move Up</Button>
                        <Button size="sm" variant="secondary" disabled={immutableSourceView} onClick={() => { const next = movePromptItem(selectedPromptItem.id, 1); if (next) setSelectedPromptItemId(next.id); }}>Move Down</Button>
                        <Button size="sm" variant="primary" disabled={immutableSourceView} onClick={() => savePromptItems(sessionPrompts.map((item) => item.id === selectedPromptItem.id ? selectedPromptItem : item))}>Save</Button>
                      </div>
                    </div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {(["prompt", "flow", "data", "safety", "qa"] as const).map((tab) => <Button key={tab} size="sm" variant={inspectorTab === tab ? "primary" : "secondary"} onClick={() => setInspectorTab(tab)}>{tab.toUpperCase()}</Button>)}
                    </div>
                    <div className="grid gap-3">
                      {inspectorTab === "prompt" && (
                        <>
                          <Field label="verbatimText"><textarea className={textareaClass} value={selectedPromptItem.verbatimText} readOnly /></Field>
                          <Field label="editableText"><textarea className={textareaClass} value={selectedPromptItem.editableText} readOnly={immutableSourceView} onChange={(event) => { updatePromptItem(selectedPromptItem.id, { editableText: event.target.value }); setSelectedPromptItemId(selectedPromptItem.id); }} /></Field>
                          <Field label="aiInstruction"><textarea className={textareaClass} value={selectedPromptItem.aiInstruction} readOnly={immutableSourceView} onChange={(event) => updatePromptItem(selectedPromptItem.id, { aiInstruction: event.target.value })} /></Field>
                          <div className="grid gap-3 md:grid-cols-2">
                            <Field label="activationCondition"><textarea className={textareaClass} value={JSON.stringify(selectedPromptItem.activationCondition ?? null, null, 2)} readOnly /></Field>
                            <Field label="validation"><textarea className={textareaClass} value={JSON.stringify(selectedPromptItem.validation ?? null, null, 2)} readOnly={immutableSourceView} onChange={(event) => { try { updatePromptItem(selectedPromptItem.id, { validation: JSON.parse(event.target.value) }); } catch { /* ignore */ } }} /></Field>
                          </div>
                        </>
                      )}
                      {inspectorTab === "flow" && <Field label="Flow"><textarea className={textareaClass} value={JSON.stringify({ entryCondition: selectedPromptItem.activationCondition, completionEffect: selectedPromptItem.completionEffect, currentNode: selectedSessionNode?.id, nextNode: sessionPrompts.find((item) => item.order === selectedPromptItem.order + 1)?.id ?? null }, null, 2)} readOnly /></Field>}
                      {inspectorTab === "data" && <Field label="Data"><textarea className={textareaClass} value={JSON.stringify({ reads: ["session memory", "previous node output", "current role"], writes: selectedPromptItem.outputFields.map((field) => ({ key: field, preserveVerbatim: true })) }, null, 2)} readOnly /></Field>}
                      {inspectorTab === "safety" && <Field label="Safety"><textarea className={textareaClass} value={JSON.stringify({ inheritedSafetyRuleIds: selectedSessionNode?.data.step.data.safetyRuleIds ?? [], prohibitedActions: ["Do not skip safety check", "Do not infer hidden content", "Do not reveal hidden scoring logic"] }, null, 2)} readOnly /></Field>}
                      {inspectorTab === "qa" && <Field label="QA"><textarea className={textareaClass} value={JSON.stringify({ checklist: ["one question only", "preserve verbatim participant wording", "do not move early", "do not replace participant summary"] }, null, 2)} readOnly /></Field>}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Badge tone="primary">{draft.data.protocolNodeId}</Badge>
                  <Badge tone="neutral">{draft.type}</Badge>
                  <StatusBadge status={draft.data.status === "needs_review" ? "review" : draft.data.status === "validation_error" ? "error" : draft.data.status === "published" ? "published" : "draft"} />
                </div>

                <Field label="Title">
                  <input value={draft.data.title} readOnly={immutableSourceView} onChange={(event) => setDraft({ ...draft, data: { ...draft.data, title: event.target.value } })} className={inputClass} />
                </Field>
                <Field label="Clinical Intent">
                  <textarea value={draft.data.clinicalIntent ?? ""} readOnly={immutableSourceView} onChange={(event) => setDraft({ ...draft, data: { ...draft.data, clinicalIntent: event.target.value } })} className={textareaClass} />
                </Field>
                <Field label="Content">
                  <textarea value={draft.data.content ?? ""} readOnly={immutableSourceView} onChange={(event) => setDraft({ ...draft, data: { ...draft.data, content: event.target.value } })} className={textareaClass} />
                </Field>

                <Field label="Source Evidence">
                  <div id="protocol-source-evidence-field" className={selectedIssue?.category === "Source Traceability" ? "rounded-panel border border-critical/40 bg-critical/10 p-2" : ""}>
                  <div className="flex flex-wrap gap-2">
                    {draft.data.sourceEvidenceIds.length ? draft.data.sourceEvidenceIds.map((id) => (
                      <SourceReferenceChip
                        key={id}
                        label={id}
                        onClick={() => {
                          const draftId = draft.data.metadata.importedFromSourceDraftId;
                          const structuredItemId = draft.data.sourceStructuredItemIds[0];
                          if (!structuredItemId || !draftId) return;
                          router.push(`/projects/demo/extraction?draft=${draftId}&item=${structuredItemId}&block=${id}`);
                        }}
                      />
                    )) : <SourceReferenceChip label="No source evidence linked" />}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <select className={inputClass} value={selectedEvidenceId} onChange={(event) => setSelectedEvidenceId(event.target.value)}>
                      <option value="">Choose evidence from this manual</option>
                      {availableEvidence.map((evidenceItem) => (
                        <option key={evidenceItem.id} value={evidenceItem.id}>{evidenceItem.sourceLocator}</option>
                      ))}
                    </select>
                    <Button variant="secondary" onClick={() => attachEvidenceMutation.mutate()} disabled={immutableSourceView || !selectedEvidenceId || attachEvidenceMutation.isPending}>
                      Add evidence
                    </Button>
                  </div>
                  {selectedIssue?.category === "Source Traceability" && (
                    <div className="mt-2 text-xs text-critical">이 이슈를 고치려면 여기에서 근거를 하나 이상 추가하세요.</div>
                  )}
                  </div>
                </Field>

                <Field label="Safety Rules">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {draft.data.safetyRuleIds.length ? draft.data.safetyRuleIds.map((id) => (
                        <Link key={id} href={`/projects/demo/safety?rule=${id}&node=${draft.id}`}>
                          <SourceReferenceChip label={id} />
                        </Link>
                      )) : <SourceReferenceChip label="No safety rule linked" />}
                    </div>
                    <select
                      className={inputClass}
                      defaultValue=""
                      disabled={immutableSourceView}
                      onChange={(event) => {
                        if (!event.target.value) return;
                        attachSafetyMutation.mutate({ nodeId: draft.id, ruleId: event.target.value });
                        event.currentTarget.value = "";
                      }}
                    >
                      <option value="">Attach safety rule</option>
                      {(safetyRulesQuery.data ?? []).map((rule) => (
                        <option key={rule.id} value={rule.id}>{rule.id} · {rule.title}</option>
                      ))}
                    </select>
                  </div>
                </Field>

                {validationRun && (
                  <motion.div className="rounded-panel border border-border p-3" variants={reducedMotion ? undefined : safetyNoticeEnter} initial={reducedMotion ? false : "initial"} animate={reducedMotion ? undefined : "animate"}>
                    <div className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">Validation issues</div>
                    <div className="mt-3 space-y-2">
                      {validationRun.issues.filter((issue) => issue.nodeId === draft.id).map((issue) => (
                        <motion.div key={issue.id} className="rounded-panel border border-border bg-surface-subtle p-3" variants={reducedMotion ? undefined : fadeUp} initial={reducedMotion ? false : "initial"} animate={reducedMotion ? undefined : "animate"}>
                          <ValidationSeverityBadge severity={issue.severity === "information" ? "info" : issue.severity} />
                          <div className="mt-2 text-sm text-text-primary">{issue.message}</div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                <div className="grid gap-2 sm:grid-cols-2">
                  <Button disabled={immutableSourceView} onClick={() => { setSaveState("saving"); if (draft) saveNodeMutation.mutate(draft); }}>Save</Button>
                  <Button variant="secondary" disabled={immutableSourceView} onClick={() => duplicateNodeMutation.mutate(draft.id)}><Copy className="h-4 w-4" />Duplicate</Button>
                  <Button variant="secondary" onClick={() => validationMutation.mutate()}><CheckCircle2 className="h-4 w-4" />Validate</Button>
                  <Button variant="danger" disabled={immutableSourceView} onClick={() => deleteNodeMutation.mutate(draft.id)}><Trash2 className="h-4 w-4" />Delete</Button>
                </div>

                <Card className="border border-border bg-surface-subtle p-3">
                  <SectionHeader title="Prompt Runtime Preview" description="PromptItem progression is stepped deterministically, one prompt at a time." />
                  <div className="mt-3 grid gap-3">
                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-panel border border-border bg-surface-subtle p-3"><div className="text-[11px] uppercase tracking-[0.08em] text-text-muted">Current session</div><div className="mt-1 text-sm font-semibold text-text-primary">{runtimeState?.currentSessionId ?? selectedSessionMeta.id}</div></div>
                      <div className="rounded-panel border border-border bg-surface-subtle p-3"><div className="text-[11px] uppercase tracking-[0.08em] text-text-muted">Current node</div><div className="mt-1 text-sm font-semibold text-text-primary">{runtimeState?.currentNodeId ?? selectedSessionNode?.id ?? "none"}</div></div>
                      <div className="rounded-panel border border-border bg-surface-subtle p-3"><div className="text-[11px] uppercase tracking-[0.08em] text-text-muted">Current prompt</div><div className="mt-1 text-sm font-semibold text-text-primary">{runtimeState?.currentPromptItemId ?? selectedPromptItem?.id ?? "none"}</div></div>
                      <div className="rounded-panel border border-border bg-surface-subtle p-3"><div className="text-[11px] uppercase tracking-[0.08em] text-text-muted">Status</div><div className="mt-1 text-sm font-semibold text-text-primary">{runtimeState?.status ?? "idle"}</div></div>
                    </div>
                    <Field label="participant response"><textarea className={textareaClass} value={runtimeInput} onChange={(event) => setRuntimeInput(event.target.value)} /></Field>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setRuntimeState({ currentSessionPlanEntryId: `${selectedSessionMeta.id}-entry`, currentSessionId: selectedSessionMeta.id, currentNodeId: selectedSessionNode?.id ?? selectedSessionMeta.id, currentPromptItemId: selectedPromptItem?.id ?? "", completedPromptItemIds: [], completedNodeIds: [], fields: {}, status: "running", safetyStatus: "clear", updatedAt: new Date().toISOString() })}>Start runtime</Button>
                      <Button size="sm" variant="primary" onClick={() => {
                        if (!runtimeState || !selectedPromptItem) return;
                        const nextIndex = sessionPrompts.findIndex((item) => item.id === runtimeState.currentPromptItemId) + 1;
                        const nextPrompt = sessionPrompts[nextIndex];
                        const validation = selectedPromptItem.validation as { kind?: string; min?: number; max?: number } | null;
                        const isValidRating = !validation || validation.kind !== "rating" || (Number(runtimeInput) >= (validation.min ?? 0) && Number(runtimeInput) <= (validation.max ?? 100));
                        if (!isValidRating) return;
                        const completedPromptItemIds = [...runtimeState.completedPromptItemIds, selectedPromptItem.id];
                        setRuntimeState({ ...runtimeState, currentPromptItemId: nextPrompt?.id ?? "", currentNodeId: nextPrompt?.nodeId ?? runtimeState.currentNodeId, completedPromptItemIds, completedNodeIds: nextPrompt && nextPrompt.nodeId !== runtimeState.currentNodeId ? [...runtimeState.completedNodeIds, runtimeState.currentNodeId] : runtimeState.completedNodeIds, fields: { ...runtimeState.fields, [selectedPromptItem.outputFields[0] ?? selectedPromptItem.id]: runtimeInput }, status: nextPrompt ? "running" : "complete", updatedAt: new Date().toISOString() });
                        setSelectedPromptItemId(nextPrompt?.id ?? selectedPromptItem.id);
                        setRuntimeInput("");
                      }}>Advance</Button>
                    </div>
                    <pre className="overflow-auto rounded-panel border border-border bg-surface p-3 text-xs text-text-secondary">{JSON.stringify(runtimeState, null, 2)}</pre>
                  </div>
                </Card>
              </motion.div>
            )}
          </Card>
        </div>

        {validationRun && (
          <motion.div variants={reducedMotion ? undefined : fadeUp} initial={reducedMotion ? false : "initial"} animate={reducedMotion ? undefined : "animate"}>
          <Card className="mt-4">
            <SectionHeader title="Latest Validation" description={validationRun.executedAt} action={<Link href="/projects/demo/validation"><Button size="sm" variant="secondary">Open Validation Center</Button></Link>} />
            <div className="grid gap-3 p-4 lg:grid-cols-3">
              {validationRun.issues.slice(0, 6).map((issue) => (
                <motion.div key={issue.id} variants={reducedMotion ? undefined : logItemEnter} initial={reducedMotion ? false : "initial"} animate={reducedMotion ? undefined : "animate"}>
                <Link href={`/projects/demo/protocols/tbct-br-001/canvas?issue=${issue.id}&node=${issue.nodeId ?? ""}`} className="rounded-panel border border-border p-3 text-left block">
                  <ValidationSeverityBadge severity={issue.severity === "information" ? "info" : issue.severity} />
                  <div className="mt-2 text-sm text-text-primary">{issue.message}</div>
                  <div className="mt-1 text-xs text-text-secondary">{issue.category}</div>
                </Link>
                </motion.div>
              ))}
              {!validationRun.issues.length && <EmptyState title="No validation issues" description="This draft currently has no recorded validation blockers." />}
            </div>
          </Card>
          </motion.div>
        )}

        <AnimatePresence>
        {runtimeLog && (
          <motion.div variants={reducedMotion ? undefined : fadeScale} initial={reducedMotion ? false : "initial"} animate={reducedMotion ? undefined : "animate"} exit={reducedMotion ? undefined : "exit"}>
          <Card className="mt-4">
            <SectionHeader title="Runtime Preview" description={runtimeLog.startedAt} action={<Button size="sm" variant="secondary" onClick={() => setRuntimeLog(null)}>Close</Button>} />
            {(runtimeMutation.isPending || createEdgeMutation.isPending || saveNodeMutation.isPending) && (
              <div className="border-b border-border px-4 py-3 text-sm text-text-secondary">Preparing next runtime step…</div>
            )}
            <div className="grid gap-3 p-4 lg:grid-cols-2">
              {runtimeLog.steps.map((step, index) => (
                <motion.div
                  key={`${step.nodeId}-${step.selectedEdgeId ?? "terminal"}`}
                  className="rounded-panel border border-border p-3"
                  variants={reducedMotion ? undefined : runtimeStepEnter}
                  initial={reducedMotion ? false : "initial"}
                  animate={reducedMotion ? undefined : "animate"}
                  transition={reducedMotion ? undefined : { delay: index * 0.04 }}
                >
                  <div className="text-sm font-semibold text-text-primary">{step.nodeId}</div>
                  <div className="mt-1 text-xs text-text-secondary">Action: {step.actionType ?? "none"}</div>
                  <div className="mt-1 text-xs text-text-secondary">Next: {step.nextNodeId ?? "end"}</div>
                  {step.selectedEdgeId && <div className="mt-2 text-[11px] text-clinical-blue">Selected edge {step.selectedEdgeId}</div>}
                </motion.div>
              ))}
            </div>
          </Card>
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      <Modal open={importPreviewOpen} onClose={() => setImportPreviewOpen(false)} title="Import Preview" description="Candidate conflicts must be resolved before final import." width="max-w-4xl">
        <div className="grid gap-4 p-5 lg:grid-cols-2">
          <Card className="p-4">
            <div className="text-sm font-semibold text-text-primary">Candidate items</div>
            <div className="mt-3 space-y-2">
              {(previewQuery.data?.candidate.items as ProtocolDraftItem[] | undefined)?.map((item) => (
                <div key={item.id} className="rounded-panel border border-border p-3">
                  <div className="text-sm font-semibold text-text-primary">{item.title}</div>
                  <div className="mt-1 text-xs text-text-secondary">{item.proposedNodeType}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm font-semibold text-text-primary">Conflicts and warnings</div>
            <div className="mt-3 space-y-2">
              {(previewQuery.data?.warnings ?? []).map((warning) => (
                <div key={warning.id} className="rounded-panel border border-border p-3">
                  <ValidationSeverityBadge severity={warning.severity === "information" ? "info" : warning.severity} />
                  <div className="mt-2 text-sm text-text-primary">{warning.message}</div>
                </div>
              ))}
              {!previewQuery.data?.warnings.length && <EmptyState title="No conflicts" description="The candidate can be imported directly into the graph." />}
            </div>
          </Card>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button variant="secondary" onClick={() => setImportPreviewOpen(false)}>Cancel</Button>
          <Button loading={importMutation.isPending} onClick={() => importMutation.mutate()}>Import candidate</Button>
        </div>
      </Modal>

      <Modal open={createNodeOpen} onClose={() => setCreateNodeOpen(false)} title="Create Protocol Node" description="Create a local graph node in Session 03.">
        <div className="grid gap-4 p-5">
          <Field label="Node type">
            <select value={newNodeForm.nodeType} onChange={(event) => setNewNodeForm((current) => ({ ...current, nodeType: event.target.value as ProtocolNodeType }))} className={inputClass}>
              {nodeTypeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </Field>
          <Field label="Title">
            <input value={newNodeForm.title} onChange={(event) => setNewNodeForm((current) => ({ ...current, title: event.target.value }))} className={inputClass} />
          </Field>
          <Field label="Clinical Intent">
            <textarea value={newNodeForm.clinicalIntent} onChange={(event) => setNewNodeForm((current) => ({ ...current, clinicalIntent: event.target.value }))} className={textareaClass} />
          </Field>
          <Field label="Content">
            <textarea value={newNodeForm.content} onChange={(event) => setNewNodeForm((current) => ({ ...current, content: event.target.value }))} className={textareaClass} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button variant="secondary" onClick={() => setCreateNodeOpen(false)}>Cancel</Button>
          <Button loading={createNodeMutation.isPending} onClick={() => createNodeMutation.mutate()}>Create node</Button>
        </div>
      </Modal>

      <Modal open={publishOpen} onClose={() => setPublishOpen(false)} title="Publish Protocol Release" description="Only validation-clean drafts can be published." width="max-w-2xl">
        <div className="grid gap-4 p-5">
          <Field label="Version">
            <input value={publishForm.version} onChange={(event) => setPublishForm((current) => ({ ...current, version: event.target.value }))} className={inputClass} />
          </Field>
          <Field label="Change Summary">
            <textarea value={publishForm.changeSummary} onChange={(event) => setPublishForm((current) => ({ ...current, changeSummary: event.target.value }))} className={textareaClass} />
          </Field>
          <div className="rounded-panel border border-border bg-surface-subtle p-3 text-xs text-text-secondary">
            Critical validation: {validationRun?.summary.critical ?? 0} · Warnings: {validationRun?.summary.warning ?? 0}
          </div>
        </div>
        <div className="flex justify-between border-t border-border px-5 py-4">
          <div className="flex gap-2">
            <Link href="/projects/demo/versions"><Button variant="secondary">Open Releases</Button></Link>
            <Button variant="secondary" onClick={() => setReleaseDraftOpen(true)} disabled={!releases[0]}>New draft from published</Button>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setPublishOpen(false)}>Cancel</Button>
            <Button loading={publishMutation.isPending} disabled={(validationRun?.summary.critical ?? 1) > 0} onClick={() => publishMutation.mutate()}>Publish</Button>
          </div>
        </div>
      </Modal>

      <Modal open={releaseDraftOpen} onClose={() => setReleaseDraftOpen(false)} title="New Draft From Published Release" description="Creates a new editable draft while preserving immutable published snapshots.">
        <div className="grid gap-4 p-5">
          <Field label="Base release">
            <input value={releases[0]?.version ?? ""} readOnly className={inputClass} />
          </Field>
          <Field label="New version">
            <input value={newDraftForm.version} onChange={(event) => setNewDraftForm((current) => ({ ...current, version: event.target.value }))} className={inputClass} />
          </Field>
          <Field label="Change summary">
            <textarea value={newDraftForm.changeSummary} onChange={(event) => setNewDraftForm((current) => ({ ...current, changeSummary: event.target.value }))} className={textareaClass} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button variant="secondary" onClick={() => setReleaseDraftOpen(false)}>Cancel</Button>
          <Button loading={newDraftMutation.isPending} onClick={() => releases[0] && newDraftMutation.mutate(releases[0].id)}>Create draft</Button>
        </div>
      </Modal>

      {!!releases[0] && (
        <div className="fixed bottom-4 right-4 z-40">
          <Button
            variant="secondary"
            onClick={async () => {
              const blob = await downloadProtocolReleasePackage(releases[0].id);
              const url = URL.createObjectURL(blob);
              const anchor = globalThis.document.createElement("a");
              anchor.href = url;
              anchor.download = `TBCT-BR-001-v${releases[0].version}.zip`;
              anchor.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="h-4 w-4" />Latest ZIP
          </Button>
        </div>
      )}
    </AppShell>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-panel border border-border bg-surface-subtle px-2 py-2 text-center">
      <div className="text-[10px] uppercase tracking-[0.08em] text-text-muted">{label}</div>
      <div className="mt-1 font-semibold text-text-primary">{value}</div>
    </div>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="text-[11px] uppercase tracking-[0.08em] text-text-muted">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-text-primary">{value}</div>
    </Card>
  );
}
