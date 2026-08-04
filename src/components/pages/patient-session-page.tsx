"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PatientShell } from "@/components/runtime/patient-shell";
import { PatientInputControls } from "@/components/runtime/patient-input-controls";
import { Badge, Button, Card, EmptyState, PageSkeleton } from "@/components/ui/primitives";
import { fadeScale, fadeUp } from "@/lib/motion/motion-variants";
import { useReducedMotionPreference } from "@/lib/motion/use-reduced-motion-preference";
import { getPatientRuntimeSession, restoreRuntimeSession } from "@/lib/api/runtime-session-api";
import { pauseRuntimeSession, resumeRuntimeSession, startRuntimeSession, submitPatientInput, terminateRuntimeSession } from "@/lib/api/runtime-execution-api";
import type { PatientInput } from "@/types/runtime-session";

export function PatientSessionPage() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const reducedMotion = useReducedMotionPreference();
  const sessionId = pathname.split("/").filter(Boolean).at(-1) ?? "";
  const sessionQuery = useQuery({ queryKey: ["patient-runtime-session", sessionId], queryFn: () => getPatientRuntimeSession(sessionId), enabled: Boolean(sessionId) });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["patient-runtime-session", sessionId] });
    await queryClient.invalidateQueries({ queryKey: ["runtime-sessions"] });
    await queryClient.invalidateQueries({ queryKey: ["safety-events"] });
  };

  const startMutation = useMutation({ mutationFn: () => startRuntimeSession(sessionId), onSuccess: async () => { toast.success("Session started"); await refresh(); } });
  const pauseMutation = useMutation({ mutationFn: () => pauseRuntimeSession(sessionId, "User requested pause"), onSuccess: async () => { toast.warning("Session paused"); await refresh(); } });
  const resumeMutation = useMutation({ mutationFn: () => resumeRuntimeSession(sessionId), onSuccess: async () => { toast.success("Session resumed"); await refresh(); } });
  const restoreMutation = useMutation({ mutationFn: () => restoreRuntimeSession(sessionId), onSuccess: async () => { toast.success("Checkpoint restored"); await refresh(); } });
  const terminateMutation = useMutation({ mutationFn: () => terminateRuntimeSession(sessionId, "Participant ended session"), onSuccess: async () => { toast.warning("Session terminated"); await refresh(); } });
  const inputMutation = useMutation({
    mutationFn: ({ currentSessionId, patientInput }: { currentSessionId: string; patientInput: PatientInput }) => submitPatientInput(currentSessionId, patientInput),
    onSuccess: async (result) => {
      if (result.stateExtraction?.missingFields.length) {
        toast.info("Please share a little more so we can stay with this question.");
      }
      await refresh();
    },
  });
  const sessionData = sessionQuery.data;
  const session = sessionData?.session;
  const currentNode = sessionData?.currentNode;
  const payload = undefined;
  const currentPromptItem = sessionData?.currentPromptInput;
  const inSafetyHold = session?.status === "safety_paused" || session?.status === "escalated";
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [previousHold, setPreviousHold] = useState(inSafetyHold);
  const resumeMessage = useMemo(() => "The safety review is complete. You can continue the session now.", []);

  useEffect(() => {
    if (previousHold && !inSafetyHold) {
      setShowResumeBanner(true);
      const timer = window.setTimeout(() => setShowResumeBanner(false), 3200);
      setPreviousHold(false);
      return () => window.clearTimeout(timer);
    }
    setPreviousHold(inSafetyHold);
    return undefined;
  }, [inSafetyHold, previousHold]);

  if (sessionQuery.isLoading) return <PatientShell title="Session"><PageSkeleton /></PatientShell>;
  if (!sessionQuery.data) {
    return (
      <PatientShell title="Session">
        <Card><EmptyState title="Session not found" description="Return to the session list and start a new runtime session." /></Card>
      </PatientShell>
    );
  }

  const { messages } = sessionQuery.data;
  const activeSession = sessionQuery.data.session;
  const patientVisibleMessages = messages.filter((message) => message.role === "patient" || message.role === "assistant" || message.role === "system");
  const activePromptSummary = (() => {
    const lastAssistantMessage = [...patientVisibleMessages].reverse().find((message) => message.role === "assistant" && ["validated", "delivered", "replaced_by_fallback"].includes(message.status));
    if (lastAssistantMessage) return lastAssistantMessage.content;
    return "Preparing your next prompt...";
  })();

  return (
    <PatientShell
      title={activeSession.patientAlias}
      sessionLabel={activeSession.sessionDefinitionId}
      progressLabel={activeSession.status}
      saveState={`Saved ${new Date(activeSession.updatedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`}
      actions={
        <Button variant="secondary" onClick={() => router.push(`/projects/demo/patient/sessions/${activeSession.id}/complete`)} disabled={activeSession.status !== "completed"}>Completion</Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-text-primary">Session</div>
                <div className="mt-1 text-xs text-text-secondary">The patient view shows only the current session state and approved patient-facing safety guidance.</div>
              </div>
              <div className="flex gap-2">
                {activeSession.status === "created" && <Button onClick={() => startMutation.mutate()}>Start</Button>}
                {activeSession.status === "waiting_for_input" && <Button variant="secondary" onClick={() => pauseMutation.mutate()}>Pause</Button>}
                {activeSession.status === "paused" && <Button onClick={() => resumeMutation.mutate()}>Resume</Button>}
                <Button variant="secondary" onClick={() => restoreMutation.mutate()}>Restore</Button>
                <Button variant="danger" onClick={() => terminateMutation.mutate()}>End</Button>
              </div>
            </div>
          </div>
          <div className="space-y-3 p-4">
            <div className="rounded-panel border border-border bg-surface-subtle px-4 py-3 text-xs text-text-secondary">
              <div className="font-semibold text-text-primary">Current prompt</div>
              <div className="mt-1 whitespace-pre-wrap break-words">{activePromptSummary}</div>
            </div>
            <AnimatePresence initial={false}>
              {patientVisibleMessages.map((message) => (
                <motion.div
                  key={message.id}
                  variants={reducedMotion ? undefined : fadeUp}
                  initial={reducedMotion ? false : "initial"}
                  animate={reducedMotion ? undefined : "animate"}
                  exit={reducedMotion ? undefined : "exit"}
                  className={`max-w-[85%] rounded-panel border px-4 py-3 text-sm ${message.role === "patient" ? "ml-auto border-clinical-blue-light bg-clinical-blue-light/60" : message.role === "system" ? "border-warning-light bg-warning-light/60" : "border-border bg-surface-subtle"}`}
                >
                  <div className="mb-1 text-[11px] font-semibold text-text-muted">{message.role === "assistant" ? "Program" : message.role === "patient" ? "You" : message.role}</div>
                  <div className="whitespace-pre-wrap break-words text-text-primary">{message.content}</div>
                </motion.div>
              ))}
            </AnimatePresence>
            {!messages.length && <EmptyState title="Start the session to see the first message." description="The published protocol release will drive the current node and the patient-facing flow." />}
          </div>
          <div className="border-t border-border p-4">
            <AnimatePresence initial={false}>
              {showResumeBanner && !inSafetyHold && (
                <motion.div
                  key="resume-banner"
                  variants={reducedMotion ? undefined : fadeScale}
                  initial={reducedMotion ? false : "initial"}
                  animate={reducedMotion ? undefined : "animate"}
                  exit={reducedMotion ? undefined : "exit"}
                  className="mb-3 rounded-panel border border-success bg-success-light px-4 py-3 text-sm text-text-primary"
                >
                  {resumeMessage}
                </motion.div>
              )}
            </AnimatePresence>
            {activeSession.status === "waiting_for_input" && currentNode && !inSafetyHold ? (
              <PatientInputControls payload={payload} promptItem={currentPromptItem} disabled={inputMutation.isPending} onSubmit={(input) => inputMutation.mutate({ currentSessionId: sessionId, patientInput: input })} />
            ) : activeSession.status === "processing" ? (
              <motion.div variants={reducedMotion ? undefined : fadeScale} initial={reducedMotion ? false : "initial"} animate={reducedMotion ? undefined : "animate"} className="text-sm text-text-secondary">
                We are reviewing your response and preparing the next step.
              </motion.div>
            ) : activeSession.status === "paused" ? (
              <div className="text-sm text-text-secondary">This session is paused. Use Resume when you are ready to continue.</div>
            ) : inSafetyHold ? (
              <motion.div
                variants={reducedMotion ? undefined : fadeScale}
                initial={reducedMotion ? false : "initial"}
                animate={reducedMotion ? undefined : "animate"}
                className="rounded-panel border border-critical-light bg-critical-light/60 p-4 text-sm text-text-primary"
              >
                <div className="font-semibold">This session is paused for a safety review.</div>
                <div className="mt-2 text-text-secondary">Regular input and protocol progression are temporarily unavailable until the review is completed.</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="critical">session hold</Badge>
                  <Badge tone="warning">waiting for review</Badge>
                </div>
              </motion.div>
            ) : activeSession.status === "completed" ? (
              <div className="text-sm text-text-secondary">This session is complete. Use Completion to review the saved result.</div>
            ) : activeSession.status === "terminated" ? (
              <div className="text-sm text-text-secondary">This session has ended and no new input can be submitted.</div>
            ) : (
              <div className="text-sm text-text-secondary">The session is being prepared.</div>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="text-sm font-semibold text-text-primary">Current status</div>
            <div className="mt-3 space-y-2">
              <Status label="Current step" value={currentNode?.title ?? "Not started"} />
              <Status label="Session state" value={activeSession.status} />
              <Status label="Risk level" value={activeSession.runtimeContext.riskLevel ?? "low"} />
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm font-semibold text-text-primary">Safety status</div>
            <div className="mt-3 space-y-2">
              <div className="text-xs text-text-secondary">{inSafetyHold ? "A safety review is in progress." : "No active safety review."}</div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm font-semibold text-text-primary">Progress</div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-subtle">
              <motion.div className="h-full bg-clinical-blue" initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.max(8, messages.length * 12))}%` }} />
            </div>
          </Card>
        </div>
      </div>
    </PatientShell>
  );
}

function Status({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-panel border border-border bg-surface-subtle p-3">
      <div className="text-[11px] uppercase tracking-[0.08em] text-text-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold text-text-primary">{value}</div>
    </div>
  );
}
