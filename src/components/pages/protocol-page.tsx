"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CheckCircle2,
  CircleDot,
  Copy,
  Link2,
  PlayCircle,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  SplitSquareHorizontal,
  Undo2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Modal,
  PageSkeleton,
  StatusBadge,
  inputClass,
  textareaClass,
} from "@/components/ui/primitives";
import { getProtocol, updateProtocolStep } from "@/lib/api/mock-api";
import { cn } from "@/lib/utils";
import { useStudioStore } from "@/stores/studio-store";
import type { ProtocolEdge, ProtocolStep } from "@/types";

function buildNodes(steps: ProtocolStep[]): Node<ProtocolNodeData>[] {
  return steps.map((step) => ({
    id: step.id,
    type: "protocolNode",
    position: step.position,
    data: {
      step,
    },
  }));
}

function buildEdges(edges: ProtocolEdge[]): Edge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    type: "smoothstep",
    animated: edge.target === "STEP-07",
    markerEnd: { type: MarkerType.ArrowClosed },
  }));
}

type ProtocolNodeData = {
  step: ProtocolStep;
};

function ProtocolNode({ data, selected }: NodeProps<Node<ProtocolNodeData>>) {
  const step = data.step;
  return (
    <div
      className={cn(
        "min-w-56 rounded-xl border bg-white px-4 py-3 shadow-panel transition",
        selected ? "border-clinical ring-2 ring-blue-100" : "border-line",
      )}
    >
      <Handle type="target" position={Position.Top} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-clinical" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={step.status === "approved" ? "green" : step.status === "review" ? "orange" : step.status === "error" ? "red" : "gray"}>
              {step.id}
            </Badge>
            {step.required && <Badge tone="blue">필수</Badge>}
          </div>
          <p className="mt-2 text-sm font-semibold text-ink">{step.title}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{step.intent}</p>
        </div>
        <CircleDot className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] text-muted">
        <InfoPill label="Sources" value={`${step.sourceCount}`} />
        <InfoPill label="Branches" value={`${step.branchCount}`} />
        <InfoPill label="Type" value={step.type.split(" ").slice(0, 1).join(" ")} />
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2.5 !w-2.5 !border-2 !border-white !bg-violet" />
    </div>
  );
}

export function ProtocolPage() {
  const searchParams = useSearchParams();
  const queryStep = searchParams.get("step");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["protocol"],
    queryFn: getProtocol,
  });

  const localSteps = useStudioStore((state) => state.localSteps);
  const setLocalSteps = useStudioStore((state) => state.setLocalSteps);
  const selectedStepId = useStudioStore((state) => state.selectedStepId);
  const setSelectedStepId = useStudioStore((state) => state.setSelectedStepId);
  const setUnsaved = useStudioStore((state) => state.setUnsaved);
  const setInspectorOpen = useStudioStore((state) => state.setInspectorOpen);
  const unsaved = useStudioStore((state) => state.unsaved);

  const [runtimeOpen, setRuntimeOpen] = useState(false);
  const [connectionCount, setConnectionCount] = useState(0);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<ProtocolNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [draft, setDraft] = useState<ProtocolStep | null>(null);

  const steps = useMemo(() => (localSteps.length ? localSteps : data?.steps ?? []), [data?.steps, localSteps]);
  const activeStep = steps.find((step) => step.id === selectedStepId) ?? steps[0];

  useEffect(() => {
    if (!data?.steps?.length) return;
    if (!localSteps.length) {
      setLocalSteps(data.steps);
    }
  }, [data?.steps, localSteps.length, setLocalSteps]);

  useEffect(() => {
    if (!steps.length) return;
    setNodes(buildNodes(steps));
    if (!edges.length && data?.edges) {
      setEdges(buildEdges(data.edges));
    }
  }, [data?.edges, edges.length, setEdges, setNodes, steps]);

  useEffect(() => {
    if (queryStep) {
      setSelectedStepId(queryStep);
      setInspectorOpen(true);
      return;
    }
    if (!selectedStepId && steps[2]) {
      setSelectedStepId(steps[2].id);
    }
  }, [queryStep, selectedStepId, setInspectorOpen, setSelectedStepId, steps]);

  useEffect(() => {
    if (!activeStep) return;
    setDraft(activeStep);
  }, [activeStep]);

  const saveMutation = useMutation({
    mutationFn: updateProtocolStep,
    onSuccess: (saved) => {
      const next = steps.map((step) => (step.id === saved.id ? saved : step));
      setLocalSteps(next);
      setNodes(buildNodes(next));
      setUnsaved(false);
      toast.success("프로토콜 노드를 저장했습니다.");
    },
  });

  const connectMutation = useMutation({
    mutationFn: async (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const next = addEdge(
        {
          ...connection,
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed },
        },
        edges,
      );
      setEdges(next);
      setConnectionCount((count) => count + 1);
      setUnsaved(true);
      toast.success("연결을 추가했습니다.");
    },
  });

  const metrics = useMemo(
    () => [
      { label: "Nodes", value: `${steps.length}` },
      { label: "Connections", value: `${edges.length}` },
      { label: "Warnings", value: `${steps.filter((step) => step.status === "review").length}` },
      { label: "Unsaved", value: unsaved ? "Yes" : "No" },
    ],
    [edges.length, steps, unsaved],
  );

  if (isLoading) {
    return (
      <AppShell title="Protocol Editor" eyebrow="Graph Workspace">
        <PageSkeleton />
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell title="Protocol Editor" eyebrow="Graph Workspace">
        <div className="p-4 lg:p-6">
          <Card>
            <ErrorState retry={refetch} />
          </Card>
        </div>
      </AppShell>
    );
  }

  if (!steps.length) {
    return (
      <AppShell title="Protocol Editor" eyebrow="Graph Workspace">
        <div className="p-4 lg:p-6">
          <Card>
            <EmptyState title="프로토콜 노드가 없습니다." description="기본 데이터가 로드되지 않았습니다." />
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Protocol Editor"
      eyebrow="Graph Workspace"
      actions={
        <>
          <Button variant="secondary" onClick={() => setRuntimeOpen(true)}>
            <PlayCircle className="h-4 w-4" />
            Runtime Preview
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setLocalSteps(data?.steps ?? steps);
              setEdges(buildEdges(data?.edges ?? []));
              setUnsaved(false);
              toast.success("기본 버전으로 되돌렸습니다.");
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Undo
          </Button>
          <Button
            loading={saveMutation.isPending}
            onClick={() => {
              if (!draft) return;
              saveMutation.mutate(draft);
            }}
          >
            <Save className="h-4 w-4" />
            Save draft
          </Button>
        </>
      }
    >
      <div className="space-y-4 p-4 lg:p-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((item) => (
            <Card key={item.label} className="p-4">
              <div className="text-[10px] uppercase tracking-wide text-muted">{item.label}</div>
              <div className="mt-2 text-2xl font-semibold text-ink">{item.value}</div>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
          <Card className="overflow-hidden">
            <div className="border-b border-line px-4 py-3">
              <h3 className="text-sm font-semibold">Session Explorer</h3>
              <p className="mt-1 text-xs text-muted">노드 목록과 상태를 빠르게 확인합니다.</p>
            </div>
            <div className="space-y-3 p-4">
              <div className="relative">
                <input className={inputClass} placeholder="Search step or intent" />
              </div>
              <div className="grid gap-2">
                {steps.map((step) => (
                  <button
                    key={step.id}
                    onClick={() => {
                      setSelectedStepId(step.id);
                      setInspectorOpen(true);
                    }}
                    className={cn(
                      "rounded-lg border px-3 py-3 text-left transition",
                      step.id === selectedStepId ? "border-clinical bg-blue-50/60" : "border-line hover:border-slate-300",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-ink">{step.title}</p>
                      <StatusBadge status={step.status} />
                    </div>
                    <p className="mt-1 truncate text-[11px] text-muted">{step.intent}</p>
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold">Protocol Canvas</h3>
                <p className="mt-1 text-xs text-muted">노드를 드래그하고 연결을 추가할 수 있습니다.</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                <Badge tone="blue">{connectionCount} new links</Badge>
                {unsaved && <Badge tone="orange">Unsaved</Badge>}
              </div>
            </div>
            <div className="h-[calc(100vh-312px)] min-h-[640px] bg-gradient-to-br from-white to-slate-50">
              <ReactFlowProvider>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={(connection) => connectMutation.mutate(connection)}
                  nodeTypes={{ protocolNode: ProtocolNode }}
                  fitView
                  snapToGrid
                  snapGrid={[16, 16]}
                  onNodeClick={(_, node) => {
                    setSelectedStepId(node.id);
                    setInspectorOpen(true);
                  }}
                  onNodeDragStop={(_, node) => {
                    const next = steps.map((step) =>
                      step.id === node.id ? { ...step, position: { x: node.position.x, y: node.position.y } } : step,
                    );
                    setLocalSteps(next);
                    setUnsaved(true);
                  }}
                  defaultEdgeOptions={{
                    type: "smoothstep",
                    markerEnd: { type: MarkerType.ArrowClosed },
                  }}
                >
                  <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
                  <MiniMap
                    pannable
                    zoomable
                    className="!bg-white"
                    nodeStrokeColor={(node) =>
                      node.id === selectedStepId ? "#315FAD" : "#8aa0bf"
                    }
                  />
                  <Controls position="bottom-left" />
                  <Panel position="top-right">
                    <div className="rounded-lg border border-line bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
                      <div className="flex items-center gap-2 text-xs font-semibold text-ink">
                        <ShieldCheck className="h-4 w-4 text-success" />
                        Clinically reviewed path
                      </div>
                      <p className="mt-1 text-[11px] text-muted">STEP-07 is currently flagged for safety review.</p>
                    </div>
                  </Panel>
                </ReactFlow>
              </ReactFlowProvider>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold">Step Inspector</h3>
                <p className="mt-1 text-xs text-muted">선택한 노드의 내용을 직접 수정합니다.</p>
              </div>
              <Settings2 className="h-4 w-4 text-clinical" />
            </div>
            <div className="max-h-[calc(100vh-312px)] space-y-4 overflow-auto p-4">
              {!draft ? (
                <EmptyState title="노드를 선택해 주세요." />
              ) : (
                <>
                  <div className="rounded-lg border border-line bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <Badge tone={draft.status === "approved" ? "green" : draft.status === "review" ? "orange" : "red"}>{draft.id}</Badge>
                      <StatusBadge status={draft.status} />
                    </div>
                    <p className="mt-2 text-sm font-semibold text-ink">{draft.title}</p>
                    <p className="mt-1 text-xs text-muted">{draft.type}</p>
                  </div>

                  <Field label="Title">
                    <input
                      value={draft.title}
                      onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Intent">
                    <textarea
                      value={draft.intent}
                      onChange={(event) => setDraft({ ...draft, intent: event.target.value })}
                      className={textareaClass}
                    />
                  </Field>
                  <Field label="Prompt">
                    <textarea
                      value={draft.prompt}
                      onChange={(event) => setDraft({ ...draft, prompt: event.target.value })}
                      className={textareaClass}
                    />
                  </Field>
                  <Field label="Guide">
                    <textarea
                      value={draft.guide}
                      onChange={(event) => setDraft({ ...draft, guide: event.target.value })}
                      className={textareaClass}
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <InfoCard label="Required" value={draft.required ? "Yes" : "No"} />
                    <InfoCard label="Sources" value={`${draft.sourceCount}`} />
                    <InfoCard label="Branches" value={`${draft.branchCount}`} />
                    <InfoCard label="Position" value={`${Math.round(draft.position.x)}, ${Math.round(draft.position.y)}`} />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setDraft((current) => (current ? { ...current, required: !current.required } : current));
                        setUnsaved(true);
                      }}
                    >
                      <SplitSquareHorizontal className="h-4 w-4" />
                      Toggle required
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        navigator.clipboard.writeText(draft.id);
                        toast.success("Step ID를 복사했습니다.");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                      Copy ID
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!draft) return;
                        setLocalSteps(steps.map((step) => (step.id === draft.id ? draft : step)));
                        setUnsaved(false);
                        toast.success("인스펙터 변경사항을 저장했습니다.");
                      }}
                    >
                      <Save className="h-4 w-4" />
                      Save step
                    </Button>
                  </div>

                  <div className="rounded-lg border border-line bg-white p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      <Link2 className="h-3.5 w-3.5" />
                      Source links
                    </div>
                    <div className="mt-3 space-y-2">
                      {[
                        "Session 03 / Transcript p.12",
                        "Session 03 / Protocol note p.04",
                        "Safety Guide / Section 2",
                      ].map((item) => (
                        <div key={item} className="flex items-center gap-2 rounded-md border border-line bg-slate-50 px-3 py-2 text-xs">
                          <ArrowUpRight className="h-4 w-4 text-clinical" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={runtimeOpen}
        onClose={() => setRuntimeOpen(false)}
        title="Runtime Preview"
        description="프로토콜 실행 시뮬레이션 화면"
        width="max-w-4xl"
      >
        <div className="grid gap-4 p-5 lg:grid-cols-[1.3fr_.9fr]">
          <Card className="p-4">
            <h4 className="text-sm font-semibold">Execution Timeline</h4>
            <div className="mt-4 space-y-3">
              {steps.slice(0, 4).map((step) => (
                <div key={step.id} className="flex items-start gap-3 rounded-lg border border-line bg-slate-50 p-3">
                  <StatusBadge status={step.status} />
                  <div>
                    <p className="text-sm font-semibold">{step.title}</p>
                    <p className="mt-1 text-xs text-muted">{step.intent}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <div className="space-y-3">
            <Card className="p-4">
              <h4 className="text-sm font-semibold">Warnings</h4>
              <p className="mt-2 text-xs text-muted">
                STEP-07 requires a final safety check before release.
              </p>
              <div className="mt-4 grid gap-2">
                <Badge tone="red">2 critical issues</Badge>
                <Badge tone="orange">7 warnings</Badge>
              </div>
            </Card>
            <Card className="p-4">
              <h4 className="text-sm font-semibold">Output</h4>
              <p className="mt-2 text-xs leading-6 text-muted">
                The runtime preview confirms the current session order and branch coverage.
              </p>
              <Button className="mt-4 w-full" onClick={() => setRuntimeOpen(false)}>
                Close preview
              </Button>
            </Card>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-slate-50 px-2 py-2 text-center">
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 font-semibold text-ink">{value}</div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-slate-50 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}
