"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PatientShell } from "@/components/runtime/patient-shell";
import { PatientInputControls } from "@/components/runtime/patient-input-controls";
import { StreamingText, TypingIndicator } from "@/components/runtime/streaming-text";
import { WorksheetPane } from "@/components/runtime/worksheet-pane";
import { hasWorksheetBindings } from "@/lib/worksheet/worksheet-binding-registry";
import { Badge, Button, Card, EmptyState, PageSkeleton } from "@/components/ui/primitives";
import { fadeScale, fadeUp } from "@/lib/motion/motion-variants";
import { useReducedMotionPreference } from "@/lib/motion/use-reduced-motion-preference";
import { getPatientRuntimeSession, getRuntimeSession } from "@/lib/api/runtime-session-api";
import { saveRemoteSessionAuditSnapshot } from "@/lib/audit/remote-session-audit";
import { computeSessionProgressPercent } from "@/lib/runtime/session-progress-estimate";
import { resumeRuntimeSession, retryStalledRuntimeNode, startRuntimeSession, submitPatientInput, terminateRuntimeSession } from "@/lib/api/runtime-execution-api";
import type { PatientInput } from "@/types/runtime-session";
import { useBrowserTts } from "@/lib/speech/use-browser-tts";
import { useT } from "@/lib/i18n/context";

function makeClientTurnId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return `TURN-${globalThis.crypto.randomUUID()}`;
  return `TURN-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function PatientSessionPage() {
  const { locale: uiLocale } = useT();
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const reducedMotion = useReducedMotionPreference();
  const sessionId = pathname.split("/").filter(Boolean).at(-1) ?? "";
  const sessionQuery = useQuery({ queryKey: ["patient-runtime-session", sessionId], queryFn: () => getPatientRuntimeSession(sessionId), enabled: Boolean(sessionId) });
  const submittingTurnRef = useRef(false);
  const [isSubmittingTurn, setIsSubmittingTurn] = useState(false);
  // Populated from the same getRuntimeSession call refresh() already makes
  // for the audit snapshot below -- no extra fetch needed, just no longer
  // discarding the result. See session-progress-estimate.ts for why this
  // is an estimate, capped short of 100% until the session actually
  // completes.
  const [progressPercent, setProgressPercent] = useState<number | undefined>(undefined);
  const lastAutoReadMessageIdRef = useRef<string | null>(null);
  // Messages already present the first time the session loads are shown in full;
  // only messages that arrive afterwards stream in, so history never replays.
  const historicalMessageIdsRef = useRef<Set<string> | null>(null);
  // One server turn can deliver several new Program messages at once (e.g.
  // a few auto-advanced steps chained before the next one that actually
  // needs a patient answer) -- without this, every one of those bubbles
  // used to mount and start streaming simultaneously the instant they
  // arrived, reading as several replies dumping out in a row instead of a
  // conversation. Tracks which new (post-mount) assistant messages have
  // finished their own reveal; only that many, plus the one currently
  // streaming, are ever rendered -- see displayMessages below.
  const [revealedNewMessageIds, setRevealedNewMessageIds] = useState<Set<string>>(new Set());

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["patient-runtime-session", sessionId] }),
      queryClient.invalidateQueries({ queryKey: ["runtime-sessions"] }),
      queryClient.invalidateQueries({ queryKey: ["safety-events"] }),
      queryClient.invalidateQueries({ queryKey: ["worksheet-view", sessionId] }),
    ]);
    // WorksheetPane (see worksheet-pane.tsx) polls on its own 4s timer,
    // independent of the chat turn that actually fills its fields -- with
    // nothing here, a long conversation could sit up to 4s (or, before the
    // await fix in runtime-execution-api.ts, indefinitely) behind what the
    // patient just answered. Invalidating its exact query key right after
    // every turn makes it refetch immediately instead of waiting on its own
    // poll.
    void getRuntimeSession(sessionId).then(async (auditView) => {
      if (!auditView) return;
      setProgressPercent(
        computeSessionProgressPercent({
          sessionDefinitionId: auditView.session.sessionDefinitionId,
          nodes: auditView.nodes,
          promptItems: auditView.promptItems,
          completedPromptItemIds: auditView.session.completedPromptItemIds ?? [],
          skippedPromptItemIds: auditView.session.skippedPromptItemIds ?? [],
          sessionStatus: auditView.session.status,
        }),
      );
      try { await saveRemoteSessionAuditSnapshot(auditView); }
      catch { toast.warning("The session continued, but its remote audit copy could not be saved."); }
    }).catch(() => {});
  };

  const startMutation = useMutation({ mutationFn: () => startRuntimeSession(sessionId), onSuccess: async () => { toast.success("Session started"); await refresh(); } });
  const resumeMutation = useMutation({ mutationFn: () => resumeRuntimeSession(sessionId), onSuccess: async () => { toast.success("Session resumed"); await refresh(); } });
  const retryMutation = useMutation({
    mutationFn: () => retryStalledRuntimeNode(sessionId),
    onSuccess: async () => { await refresh(); },
    onError: () => { toast.error("Still not ready -- please try again in a moment."); },
  });
  const terminateMutation = useMutation({
    mutationFn: () => terminateRuntimeSession(sessionId, "Participant ended session"),
    onSuccess: async () => {
      // Stop all recording and playback when the session ends.
      stop();
      toast.warning("Session terminated");
      await refresh();
    },
  });
  const inputMutation = useMutation({
    mutationFn: ({ currentSessionId, patientInput, clientTurnId, expectedSessionVersion }: { currentSessionId: string; patientInput: PatientInput; clientTurnId: string; expectedSessionVersion: number }) => submitPatientInput(currentSessionId, patientInput, { clientTurnId, expectedSessionVersion, locale: uiLocale === "ko" ? "ko-KR" : "en-US" }),
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

  // Status "active" is meant to be a brief in-flight moment on the way to the
  // next real state (see executeCurrentNode's recursive chain in
  // runtime-execution-api.ts) -- but if a step in that chain throws, the
  // session can be left sitting here indefinitely with no other recovery
  // path (confirmed live). A few auto-retries with a short, growing pause
  // clear the ordinary transient case without the patient having to do
  // anything; the manual button below covers whatever's left.
  const autoRetryCountRef = useRef(0);
  const isStalledActive = sessionData?.session?.status === "active";
  useEffect(() => {
    if (!isStalledActive) { autoRetryCountRef.current = 0; return undefined; }
    if (autoRetryCountRef.current >= 3) return undefined;
    const delayMs = 4000 * (autoRetryCountRef.current + 1);
    const timer = window.setTimeout(() => {
      autoRetryCountRef.current += 1;
      retryMutation.mutate();
    }, delayMs);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStalledActive, sessionData?.session?.updatedAt]);

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
  const isKoreanSession = uiLocale === "ko";
  // A freshly-created session sits in "created" status until something
  // calls startRuntimeSession -- patient-new-session-page.tsx used to
  // await that itself (the first AI turn's full generation, sometimes
  // chained through several auto-delivered nodes before the first one
  // that actually needs a patient answer) before ever navigating here,
  // so the "새 세션" button just sat there spinning with no feedback for
  // however long that took. It now navigates immediately once the
  // session row exists; this effect picks up the actual start from here
  // instead, where the existing "처리 중" (processing) state below already
  // gives the patient something to look at while it runs. autoStartedRef
  // guards against re-firing on every refetch/re-render -- if the mutation
  // itself fails, the still-present manual "Start" button (further down)
  // is the fallback, not an automatic retry loop.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (activeSession?.status === "created" && !autoStartedRef.current) {
      autoStartedRef.current = true;
      startMutation.mutate();
    }
  }, [activeSession?.status, startMutation]);
  const tts = useBrowserTts(activeSession?.locale ?? "en-US");
  const { supported: ttsSupported, speak, stop } = tts;
  const patientVisibleMessages = messages.filter((message) => message.role === "patient" || message.role === "assistant" || message.role === "system");
  const latestAssistantMessage = [...patientVisibleMessages].reverse().find((message) => message.role === "assistant");

  // Walks patientVisibleMessages in order, including every historical
  // message and every new patient/system message immediately (nothing to
  // gate -- there's no streaming reveal for those), but stopping right
  // after the first new assistant message that hasn't finished revealing
  // yet -- so a batch of several new Program messages still appears one at
  // a time, in order, each one only mounting once the last one is done.
  const displayMessages = useMemo(() => {
    const result: typeof patientVisibleMessages = [];
    for (const message of patientVisibleMessages) {
      const isHistorical = historicalMessageIdsRef.current?.has(message.id) ?? true;
      result.push(message);
      if (!isHistorical && message.role === "assistant" && !revealedNewMessageIds.has(message.id)) break;
    }
    return result;
  }, [patientVisibleMessages, revealedNewMessageIds]);

  useEffect(() => {
    if (historicalMessageIdsRef.current === null && messages.length) {
      historicalMessageIdsRef.current = new Set(messages.map((message) => message.id));
    }
  }, [messages]);

  // Every new approved Program message is read aloud automatically.
  useEffect(() => {
    if (!ttsSupported || !latestAssistantMessage || lastAutoReadMessageIdRef.current === latestAssistantMessage.id) return;
    lastAutoReadMessageIdRef.current = latestAssistantMessage.id;
    speak(latestAssistantMessage.id, latestAssistantMessage.content);
  }, [latestAssistantMessage, speak, ttsSupported]);

  if (sessionQuery.isLoading) return <PatientShell title="세션"><PageSkeleton /></PatientShell>;
  if (!sessionQuery.data || !activeSession) {
    return (
      <PatientShell title="세션">
        <Card><EmptyState title="세션을 찾을 수 없습니다" description="세션 목록으로 돌아가 새 세션을 시작해 주세요." /></Card>
      </PatientShell>
    );
  }

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

  return (
    <PatientShell
      title={isKoreanSession && activeSession.patientAlias === "Test Patient" ? "참여자" : activeSession.patientAlias}
      sessionLabel={isKoreanSession ? `${Number(activeSession.sessionDefinitionId.match(/s(\d+)/i)?.[1] ?? 0)}회기` : activeSession.sessionDefinitionId}
      progressLabel={isKoreanSession ? ({ waiting_for_input: "응답 대기", processing: "처리 중", preparing: "준비 중", active: "진행 중", paused: "일시 중지", completed: "완료", created: "생성됨", terminated: "종료됨", safety_paused: "안전 확인 중", escalated: "검토 요청됨", failed: "오류" }[activeSession.status] ?? activeSession.status) : activeSession.status}
      progressPercent={progressPercent}
      saveState={`${isKoreanSession ? "저장됨" : "Saved"} ${new Date(activeSession.updatedAt).toLocaleString(isKoreanSession ? "ko-KR" : "en-US", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })} KST`}
      actions={
        <Button variant="secondary" onClick={() => router.push(`/projects/demo/patient/sessions/${activeSession.id}/complete`)} disabled={activeSession.status !== "completed"}>{isKoreanSession ? "완료 내역" : "Completion"}</Button>
      }
    >
      <div className={hasWorksheetBindings(activeSession.sessionDefinitionId) ? "mx-auto grid max-w-6xl gap-4 lg:grid-cols-[1.1fr_1fr]" : "mx-auto max-w-3xl"}>
        <Card className="overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-text-primary">{isKoreanSession ? "세션" : "Session"}</div>
                <div className="mt-1 text-xs text-text-secondary">{isKoreanSession ? "현재 세션 상태와 참여자에게 승인된 안내만 표시됩니다." : "The patient view shows only the current session state and approved patient-facing safety guidance."}</div>
              </div>
              <div className="flex gap-2">
                {activeSession.status === "created" && <Button onClick={() => startMutation.mutate()}>Start</Button>}
                {activeSession.status === "paused" && <Button onClick={() => resumeMutation.mutate()}>Resume</Button>}
                <Button variant="danger" onClick={() => terminateMutation.mutate()}>{isKoreanSession ? "종료" : "End"}</Button>
              </div>
            </div>
          </div>
          <div className="space-y-3 p-4">
            <AnimatePresence initial={false}>
              {displayMessages.map((message) => {
                const isNewAssistantTurn = message.role === "assistant" && historicalMessageIdsRef.current !== null && !historicalMessageIdsRef.current.has(message.id);
                return (
                  <motion.div
                    key={message.id}
                    variants={reducedMotion ? undefined : fadeUp}
                    initial={reducedMotion ? false : "initial"}
                    animate={reducedMotion ? undefined : "animate"}
                    exit={reducedMotion ? undefined : "exit"}
                    layout={reducedMotion ? undefined : true}
                    className={`max-w-[85%] rounded-panel border px-4 py-3 text-sm ${message.role === "patient" ? "ml-auto border-clinical-blue-light bg-clinical-blue-light/60" : message.role === "system" ? "border-warning-light bg-warning-light/60" : "border-border bg-surface-subtle"}`}
                  >
                    <div className="mb-1 text-[11px] font-semibold text-text-muted">{message.role === "assistant" ? (isKoreanSession ? "프로그램" : "Program") : message.role === "patient" ? (isKoreanSession ? "나" : "You") : message.role}</div>
                    <StreamingText
                      streamKey={message.id}
                      text={message.content}
                      active={isNewAssistantTurn}
                      speedMs={8}
                      onDone={() => { if (isNewAssistantTurn) setRevealedNewMessageIds((prev) => (prev.has(message.id) ? prev : new Set(prev).add(message.id))); }}
                      className="whitespace-pre-wrap break-words text-text-primary"
                    />
                  </motion.div>
                );
              })}
              {(activeSession.status === "processing" || isSubmittingTurn) && (
                <motion.div
                  key="typing-indicator"
                  variants={reducedMotion ? undefined : fadeUp}
                  initial={reducedMotion ? false : "initial"}
                  animate={reducedMotion ? undefined : "animate"}
                  exit={reducedMotion ? undefined : "exit"}
                  className="max-w-[85%] rounded-panel border border-border bg-surface-subtle px-4 py-3 text-sm"
                >
                  <div className="mb-1 text-[11px] font-semibold text-text-muted">{isKoreanSession ? "프로그램" : "Program"}</div>
                  <TypingIndicator />
                </motion.div>
              )}
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
            {activeSession.status === "waiting_for_input" && currentNode && !inSafetyHold && !isSubmittingTurn ? (
              <PatientInputControls
                payload={payload}
                promptItem={currentPromptItem}
                disabled={inputMutation.isPending || isSubmittingTurn}
                onSubmit={submitInput}
                locale={activeSession.locale}
                onBeforeMic={stop}
              />
            ) : activeSession.status === "processing" || isSubmittingTurn ? (
              <motion.div variants={reducedMotion ? undefined : fadeScale} initial={reducedMotion ? false : "initial"} animate={reducedMotion ? undefined : "animate"} className="text-sm text-text-secondary">
                {isKoreanSession ? "응답을 확인하고 다음 단계를 준비하고 있습니다." : "We are reviewing your response and preparing the next step."}
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
            ) : activeSession.status === "active" ? (
              <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
                <span>The session is being prepared{retryMutation.isPending ? "…" : "."}</span>
                <Button variant="secondary" disabled={retryMutation.isPending} onClick={() => retryMutation.mutate()}>Try again</Button>
              </div>
            ) : (
              <div className="text-sm text-text-secondary">The session is being prepared.</div>
            )}
          </div>
        </Card>
        {hasWorksheetBindings(activeSession.sessionDefinitionId) && (
          <WorksheetPane
            runtimeSessionId={activeSession.id}
            sessionDefinitionId={activeSession.sessionDefinitionId}
            activeCanonicalFieldKey={currentPromptItem?.outputFields?.[0]}
            variant="patient"
            locale={activeSession.locale}
          />
        )}
      </div>
    </PatientShell>
  );
}
