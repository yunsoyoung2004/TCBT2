"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PatientShell } from "@/components/runtime/patient-shell";
import { PatientInputControls } from "@/components/runtime/patient-input-controls";
import { Badge, Button, Card, EmptyState, PageSkeleton } from "@/components/ui/primitives";
import { fadeScale, fadeUp } from "@/lib/motion/motion-variants";
import { useReducedMotionPreference } from "@/lib/motion/use-reduced-motion-preference";
import { getPatientRuntimeSession, getRuntimeSession, restoreRuntimeSession } from "@/lib/api/runtime-session-api";
import { saveRemoteSessionAuditSnapshot } from "@/lib/audit/remote-session-audit";
import { pauseRuntimeSession, resumeRuntimeSession, startRuntimeSession, submitPatientInput, terminateRuntimeSession } from "@/lib/api/runtime-execution-api";
import type { PatientInput } from "@/types/runtime-session";
import { useBrowserTts } from "@/lib/speech/use-browser-tts";
import { useAudioRecorder } from "@/lib/speech/use-audio-recorder";

function makeClientTurnId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return `TURN-${globalThis.crypto.randomUUID()}`;
  return `TURN-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function PatientSessionPage() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const reducedMotion = useReducedMotionPreference();
  const sessionId = pathname.split("/").filter(Boolean).at(-1) ?? "";
  const sessionQuery = useQuery({ queryKey: ["patient-runtime-session", sessionId], queryFn: () => getPatientRuntimeSession(sessionId), enabled: Boolean(sessionId) });
  const submittingTurnRef = useRef(false);
  const [isSubmittingTurn, setIsSubmittingTurn] = useState(false);
  const [autoRead, setAutoRead] = useState(false);
  const [isSendingRecording, setIsSendingRecording] = useState(false);
  const lastAutoReadMessageIdRef = useRef<string | null>(null);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["patient-runtime-session", sessionId] });
    await queryClient.invalidateQueries({ queryKey: ["runtime-sessions"] });
    await queryClient.invalidateQueries({ queryKey: ["safety-events"] });
    const auditView = await getRuntimeSession(sessionId);
    if (auditView) {
      try { await saveRemoteSessionAuditSnapshot(auditView); }
      catch { toast.warning("The session continued, but its remote audit copy could not be saved."); }
    }
  };

  const startMutation = useMutation({ mutationFn: () => startRuntimeSession(sessionId), onSuccess: async () => { toast.success("Session started"); await refresh(); } });
  const pauseMutation = useMutation({ mutationFn: () => pauseRuntimeSession(sessionId, "User requested pause"), onSuccess: async () => { toast.warning("Session paused"); await refresh(); } });
  const resumeMutation = useMutation({ mutationFn: () => resumeRuntimeSession(sessionId), onSuccess: async () => { toast.success("Session resumed"); await refresh(); } });
  const restoreMutation = useMutation({ mutationFn: () => restoreRuntimeSession(sessionId), onSuccess: async () => { toast.success("Checkpoint restored"); await refresh(); } });
  const terminateMutation = useMutation({ mutationFn: () => terminateRuntimeSession(sessionId, "Participant ended session"), onSuccess: async () => { toast.warning("Session terminated"); await refresh(); } });
  const inputMutation = useMutation({
    mutationFn: ({ currentSessionId, patientInput, clientTurnId, expectedSessionVersion }: { currentSessionId: string; patientInput: PatientInput; clientTurnId: string; expectedSessionVersion: number }) => submitPatientInput(currentSessionId, patientInput, { clientTurnId, expectedSessionVersion }),
    onSuccess: async (result) => {
      if (result.stateExtraction?.missingFields.length) {
        toast.info("Please share a little more so we can stay with this question.");
      }
      await refresh();
    },
    onError: () => {
      toast.error("We could not submit that response. Please try again.");
    },
    onSettled: () => {
      submittingTurnRef.current = false;
      setIsSubmittingTurn(false);
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

  const messages = sessionData?.messages ?? [];
  const activeSession = sessionData?.session;
  const tts = useBrowserTts(activeSession?.locale ?? "en-US");
  const recorder = useAudioRecorder();
  const { supported: ttsSupported, speakingMessageId, speak, stop } = tts;
  const patientVisibleMessages = messages.filter((message) => message.role === "patient" || message.role === "assistant" || message.role === "system");
  const latestAssistantMessage = [...patientVisibleMessages].reverse().find((message) => message.role === "assistant");

  useEffect(() => {
    const stored = window.localStorage.getItem("tbct:auto-read");
    if (stored === "true") setAutoRead(true);
  }, []);

  useEffect(() => {
    if (!autoRead || !ttsSupported || !latestAssistantMessage || lastAutoReadMessageIdRef.current === latestAssistantMessage.id) return;
    lastAutoReadMessageIdRef.current = latestAssistantMessage.id;
    speak(latestAssistantMessage.id, latestAssistantMessage.content);
  }, [autoRead, latestAssistantMessage, speak, ttsSupported]);

  if (sessionQuery.isLoading) return <PatientShell title="Session"><PageSkeleton /></PatientShell>;
  if (!sessionQuery.data || !activeSession) {
    return (
      <PatientShell title="Session">
        <Card><EmptyState title="Session not found" description="Return to the session list and start a new runtime session." /></Card>
      </PatientShell>
    );
  }

  const toggleAutoRead = () => {
    const next = !autoRead;
    setAutoRead(next);
    window.localStorage.setItem("tbct:auto-read", String(next));
    if (!next) stop();
  };
  const submitInput = (patientInput: PatientInput) => {
    if (submittingTurnRef.current || activeSession.status !== "waiting_for_input") return;
    submittingTurnRef.current = true;
    setIsSubmittingTurn(true);
    inputMutation.mutate({
      currentSessionId: sessionId,
      patientInput,
      clientTurnId: makeClientTurnId(),
      expectedSessionVersion: activeSession.version ?? 0,
    });
  };
  const sendRecording = async () => {
    if (!recorder.audioBlob || isSendingRecording || activeSession.status !== "waiting_for_input") return;
    setIsSendingRecording(true);
    try {
      const form = new FormData();
      const extension = recorder.audioBlob.type.includes("mp4") ? "m4a" : "webm";
      form.set("audio", recorder.audioBlob, `patient-recording.${extension}`);
      form.set("locale", activeSession.locale);
      const response = await fetch("/api/speech/transcribe", { method: "POST", body: form });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok || typeof payload.data?.text !== "string") throw new Error(typeof payload?.error === "string" ? payload.error : "Voice transcription failed.");
      recorder.clear();
      submitInput({ kind: "text", value: payload.data.text });
      toast.success("Voice response transcribed and sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Voice response could not be sent.");
    } finally {
      setIsSendingRecording(false);
    }
  };

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
                {ttsSupported && <Button variant="secondary" onClick={toggleAutoRead}>{autoRead ? "Auto voice: on" : "Auto voice: off"}</Button>}
                {recorder.supported && !recorder.isRecording && <Button variant="secondary" onClick={() => void recorder.start()}>Record voice</Button>}
                {recorder.supported && recorder.isRecording && <Button variant="danger" onClick={recorder.stop}>Stop recording</Button>}
                {activeSession.status === "created" && <Button onClick={() => startMutation.mutate()}>Start</Button>}
                {activeSession.status === "waiting_for_input" && <Button variant="secondary" onClick={() => pauseMutation.mutate()}>Pause</Button>}
                {activeSession.status === "paused" && <Button onClick={() => resumeMutation.mutate()}>Resume</Button>}
                <Button variant="secondary" onClick={() => restoreMutation.mutate()}>Restore</Button>
                <Button variant="danger" onClick={() => terminateMutation.mutate()}>End</Button>
              </div>
            </div>
          </div>
          {(recorder.audioUrl || recorder.error || recorder.isRecording) && (
            <div className="border-b border-border bg-surface-subtle px-4 py-3">
              {recorder.isRecording && <div className="text-xs font-semibold text-critical">Recording locally… Press Stop recording when finished.</div>}
              {recorder.error && <div className="text-xs text-critical">{recorder.error}</div>}
              {recorder.audioUrl && (
                <div className="flex flex-wrap items-center gap-3">
                  <audio controls src={recorder.audioUrl} className="h-9 max-w-full" aria-label="Recorded voice preview" />
                  <Button onClick={() => void sendRecording()} disabled={isSendingRecording || activeSession.status !== "waiting_for_input"}>{isSendingRecording ? "Sending voice…" : "Send voice"}</Button>
                  <Button variant="secondary" onClick={recorder.clear}>Delete recording</Button>
                  <span className="text-xs text-text-muted">Send voice uploads this recording to Groq for transcription; the app does not retain the audio file.</span>
                </div>
              )}
            </div>
          )}
          <div className="space-y-3 p-4">
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
                  {message.role === "assistant" && ttsSupported && (
                    <div className="mt-2">
                      <button type="button" className="text-xs font-semibold text-clinical-blue hover:underline" aria-label={speakingMessageId === message.id ? "Stop reading message" : "Read message aloud"} onClick={() => speakingMessageId === message.id ? stop() : speak(message.id, message.content)}>
                        {speakingMessageId === message.id ? "Stop voice" : "Read aloud"}
                      </button>
                    </div>
                  )}
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
              <PatientInputControls payload={payload} promptItem={currentPromptItem} disabled={inputMutation.isPending || isSubmittingTurn} onSubmit={submitInput} />
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
