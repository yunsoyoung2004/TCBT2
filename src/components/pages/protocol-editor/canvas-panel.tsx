"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  type Connection,
  type Edge,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import { Card, SectionHeader } from "@/components/ui/primitives";
import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { nodeTone, summarizeCondition, type FlowNode } from "./types";

function ProtocolNodeView({ data, selected }: NodeProps<FlowNode>) {
  const { t } = useT();
  const step = data.step;
  const isStart = step.type === "session_start";
  const isComplete = step.type === "session_complete";
  const rawCondition = (step.data.runtimeAction?.payload as Record<string, unknown> | undefined)?.activationCondition;
  const conditionSummary = summarizeCondition(rawCondition as { kind?: string; field?: string; operator?: string; value?: unknown } | null | undefined);
  const promptCount = step.data.promptItemIds?.length ?? 0;

  return (
    <div className={cn("relative min-w-[230px] rounded-panel border bg-surface px-4 py-3", nodeTone(step.data.status), selected && "ring-2 ring-clinical-blue-light")}>
      <Handle type="target" position={Position.Top} className="!h-4 !w-4 !border-2 !border-white !bg-clinical-blue !shadow-md" style={{ top: -8 }} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {isStart && <span className="rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-success">Start</span>}
            {isComplete && <span className="rounded-full bg-clinical-blue-light px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-clinical-blue">Complete</span>}
          </div>
          <div className="mt-2 text-sm font-semibold text-text-primary">{step.data.title}</div>
          <div className="mt-1 truncate-2 text-xs leading-5 text-text-secondary">{step.data.clinicalIntent}</div>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-1 text-[11px] text-text-secondary">
        <span>{t("protocolEditor.questionsCount", { count: promptCount })}</span>
        {step.data.safetyRuleIds.length > 0 ? (
          <span className="font-semibold text-critical">{t("protocolEditor.requiredSafetyStep")}</span>
        ) : conditionSummary ? (
          <span>{t("protocolEditor.shownWhen", { condition: conditionSummary })}</span>
        ) : null}
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-4 !w-4 !border-2 !border-white !bg-ai-violet !shadow-md" style={{ bottom: -8 }} />
    </div>
  );
}

export const protocolNodeTypes = { protocolNode: ProtocolNodeView };

interface CanvasPanelProps {
  flowNodes: FlowNode[];
  edges: Edge[];
  immutableSourceView: boolean;
  onNodesChange: (changes: NodeChange[]) => void;
  onNodeClick: (nodeId: string) => void;
  onNodeDragStart: (nodeId: string) => void;
  onNodeDragStop: (nodeId: string, position: { x: number; y: number }) => void;
  onConnect: (connection: Connection) => void;
  onEdgeDoubleClick: (edgeId: string) => void;
  /** Overrides the canvas viewport's height classes. Defaults to the
   * original desktop-tuned value below, so every existing (desktop/tablet)
   * call site that omits this prop renders exactly as before -- only the
   * mobile "Flow" tab passes a full-viewport override. */
  heightClassName?: string;
  /** Extra class on the outer Card, used by the mobile "Flow" tab to scope
   * touch-target CSS (see globals.css's .mobile-flow-view rule) without any
   * selector that could ever match the desktop tree. */
  className?: string;
}

export function CanvasPanel({ flowNodes, edges, immutableSourceView, onNodesChange, onNodeClick, onNodeDragStart, onNodeDragStop, onConnect, onEdgeDoubleClick, heightClassName, className }: CanvasPanelProps) {
  const { t } = useT();
  return (
    <Card className={cn("min-w-0 flex-1 overflow-hidden", className)}>
      <SectionHeader title={t("protocolEditor.protocolCanvas")} />
      <div className={cn("relative w-full dot-grid", heightClassName ?? "h-[calc(100vh-330px)] min-h-[520px]")}>
        <ReactFlowProvider>
          <div className="absolute inset-0 h-full w-full">
            <ReactFlow
              className="h-full w-full"
              style={{ height: "100%", width: "100%" }}
              nodes={flowNodes}
              edges={edges}
              nodeTypes={protocolNodeTypes}
              nodesDraggable={!immutableSourceView}
              nodesConnectable={!immutableSourceView}
              onNodesChange={(changes: NodeChange[]) => onNodesChange(changes)}
              onNodeClick={(_, node) => onNodeClick(node.id)}
              onNodeDragStart={(_, node) => onNodeDragStart(node.id)}
              onNodeDragStop={(_, node) => onNodeDragStop(node.id, node.position)}
              onConnect={(connection: Connection) => onConnect(connection)}
              onEdgeDoubleClick={(_, edge) => onEdgeDoubleClick(edge.id)}
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
  );
}
