"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  Edit3,
  RotateCcw,
  Send,
  Sparkles,
  SquareCheckBig,
  UserCircle2,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Field,
  Modal,
  PageSkeleton,
  StatusBadge,
  inputClass,
  textareaClass,
} from "@/components/ui/primitives";
import { approveExtraction, getExtraction } from "@/lib/api/mock-api";
import type { ProtocolStep, TranscriptSegment } from "@/types";

type DraftState = {
  title: string;
  intent: string;
  prompt: string;
  guide: string;
  reviewer: string;
  notes: string;
};

export function ExtractionPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["extraction-review"],
    queryFn: getExtraction,
  });

  const [activeIndex, setActiveIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [comment, setComment] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (!data?.step) return;
    setDraft({
      title: data.step.title,
      intent: data.step.intent,
      prompt: data.step.prompt,
      guide: data.step.guide,
      reviewer: "김지훈",
      notes: "AI 초안에서 검토가 필요한 문장만 표시합니다.",
    });
  }, [data]);

  useEffect(() => {
    if (!data?.transcript?.length) return;
    setActiveIndex((current) => Math.min(current, data.transcript.length - 1));
  }, [data?.transcript?.length]);

  const approve = useMutation({
    mutationFn: (stepId: string) => approveExtraction(stepId),
    onSuccess: (_, stepId) => {
      toast.success("추출 초안을 승인했습니다.", {
        description: `${stepId}가 다음 단계로 넘어갑니다.`,
      });
    },
  });

  const step = data?.step;
  const transcript = data?.transcript ?? [];
  const currentSegment = transcript[activeIndex];

  const shortcuts = useMemo(
    () => [
      { key: "A", label: "승인", hint: "초안을 승인하고 다음 단계로 이동" },
      { key: "E", label: "편집", hint: "초안 편집 모드 전환" },
      { key: "R", label: "거절", hint: "거절 사유를 남기고 반려" },
      { key: "J / K", label: "이전 / 다음", hint: "세그먼트 사이를 빠르게 이동" },
    ],
    [],
  );

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey) return;
    const target = event.target as HTMLElement;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

    if (event.key.toLowerCase() === "a" && step) {
      approve.mutate(step.id);
    }
    if (event.key.toLowerCase() === "e") {
      setEditing((value) => !value);
    }
    if (event.key.toLowerCase() === "r") {
      setRejectOpen(true);
    }
    if (event.key.toLowerCase() === "j") {
      setActiveIndex((value) => Math.min(value + 1, Math.max(transcript.length - 1, 0)));
    }
    if (event.key.toLowerCase() === "k") {
      setActiveIndex((value) => Math.max(value - 1, 0));
    }
  };

  if (isLoading) {
    return (
      <AppShell title="Extraction Review" eyebrow="AI Draft Triage">
        <PageSkeleton />
      </AppShell>
    );
  }

  if (isError || !step || !draft) {
    return (
      <AppShell title="Extraction Review" eyebrow="AI Draft Triage">
        <div className="p-4 lg:p-6">
          <Card>
            <ErrorState retry={refetch} />
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Extraction Review"
      eyebrow="AI Draft Triage"
      actions={
        <>
          <Button variant="secondary" onClick={() => setActiveIndex((value) => Math.max(value - 1, 0))}>
            <ChevronLeft className="h-4 w-4" />
            이전
          </Button>
          <Button variant="secondary" onClick={() => setActiveIndex((value) => Math.min(value + 1, transcript.length - 1))}>
            다음
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="secondary" onClick={() => setEditing((value) => !value)}>
            <Edit3 className="h-4 w-4" />
            {editing ? "읽기 모드" : "편집"}
          </Button>
          <Button
            loading={approve.isPending}
            onClick={() => approve.mutate(step.id)}
          >
            <CheckCircle2 className="h-4 w-4" />
            승인
          </Button>
        </>
      }
    >
      <div className="space-y-4 p-4 lg:p-6" onKeyDown={handleKeyDown} tabIndex={0}>
        <Card className="border-blue-100 bg-gradient-to-r from-blue-50 to-violet-50 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="blue" dot>
                  {step.id}
                </Badge>
                <Badge tone="violet">{step.type}</Badge>
                <span className="text-xs text-muted">Confidence 92%</span>
              </div>
              <h2 className="mt-2 text-lg font-semibold text-ink">{draft.title}</h2>
              <p className="mt-1 max-w-3xl text-sm text-muted">{draft.notes}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Metric label="검토자" value={draft.reviewer} />
              <Metric label="소스 링크" value={`${step.sourceCount}개`} />
              <Metric label="분기 수" value={`${step.branchCount}개`} />
            </div>
          </div>
        </Card>

        <div className="grid gap-4 xl:grid-cols-[32%_43%_25%]">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold">Transcript Viewer</h3>
                <p className="text-xs text-muted">PDF와 전사 내용을 함께 확인합니다.</p>
              </div>
              <Badge tone="blue">{transcript.length} segments</Badge>
            </div>
            <div className="border-b border-line bg-slate-50 px-4 py-3">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>TBCT Session 03 / Interview Note</span>
                <span>p. 12-18</span>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[10px] font-semibold uppercase tracking-wide text-muted">
                <div className="rounded bg-white py-2 shadow-sm">PDF</div>
                <div className="rounded bg-white py-2 shadow-sm">Transcript</div>
                <div className="rounded bg-white py-2 shadow-sm">Sources</div>
                <div className="rounded bg-white py-2 shadow-sm">Highlights</div>
              </div>
            </div>
            <div className="max-h-[calc(100vh-310px)] space-y-3 overflow-auto p-4">
              {transcript.map((segment, index) => (
                <TranscriptRow
                  key={segment.id}
                  active={index === activeIndex}
                  segment={segment}
                  onClick={() => setActiveIndex(index)}
                />
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold">Structured Draft</h3>
                <p className="text-xs text-muted">AI가 추출한 초안을 바로 다듬습니다.</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={step.status} />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEditing(false);
                    toast.success("초안을 저장했습니다.");
                  }}
                >
                  <Send className="h-4 w-4" />
                  저장
                </Button>
              </div>
            </div>

            <div className="max-h-[calc(100vh-310px)] overflow-auto p-4">
              <div className="grid gap-4">
                <Field label="Step title">
                  <input
                    value={draft.title}
                    readOnly={!editing}
                    onChange={(event) =>
                      setDraft((value) => (value ? { ...value, title: event.target.value } : value))
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="Intent">
                  <textarea
                    value={draft.intent}
                    readOnly={!editing}
                    onChange={(event) =>
                      setDraft((value) => (value ? { ...value, intent: event.target.value } : value))
                    }
                    className={textareaClass}
                  />
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Prompt">
                    <textarea
                      value={draft.prompt}
                      readOnly={!editing}
                      onChange={(event) =>
                        setDraft((value) => (value ? { ...value, prompt: event.target.value } : value))
                      }
                      className={textareaClass}
                    />
                  </Field>
                  <Field label="Guidance">
                    <textarea
                      value={draft.guide}
                      readOnly={!editing}
                      onChange={(event) =>
                        setDraft((value) => (value ? { ...value, guide: event.target.value } : value))
                      }
                      className={textareaClass}
                    />
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <InfoTile label="Required" value={step.required ? "예" : "아니오"} />
                  <InfoTile label="Sources" value={`${step.sourceCount}`} />
                  <InfoTile label="Branches" value={`${step.branchCount}`} />
                </div>
                <div className="rounded-lg border border-line bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Exposed Sources</h4>
                    <Badge tone="blue">2 linked pages</Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    {["Source note A", "Source note B", "Quoted instruction"].map((item) => (
                      <div key={item} className="flex items-center gap-3 rounded-md border border-line bg-white px-3 py-2 text-xs">
                        <ClipboardList className="h-4 w-4 text-clinical" />
                        <span className="flex-1">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold">Review Panel</h3>
                <p className="text-xs text-muted">승인 또는 반려를 빠르게 처리합니다.</p>
              </div>
              <Sparkles className="h-4 w-4 text-violet" />
            </div>
            <div className="space-y-4 p-4">
              <div className="rounded-lg border border-line bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">Assignment</span>
                  <UserCircle2 className="h-4 w-4 text-clinical" />
                </div>
                <p className="mt-2 text-sm font-semibold">{draft.reviewer}</p>
                <p className="mt-1 text-xs text-muted">Clinical reviewer on duty</p>
              </div>

              <Field label="Reviewer note">
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  className={textareaClass}
                  placeholder="검토 소견을 남겨주세요."
                />
              </Field>

              <div className="grid gap-2">
                <Button
                  loading={approve.isPending}
                  onClick={() => approve.mutate(step.id)}
                  className="w-full"
                >
                  <SquareCheckBig className="h-4 w-4" />
                  승인하고 다음으로
                </Button>
                <Button variant="secondary" className="w-full" onClick={() => setEditing((value) => !value)}>
                  <Edit3 className="h-4 w-4" />
                  {editing ? "편집 종료" : "편집 모드"}
                </Button>
                <Button variant="secondary" className="w-full" onClick={() => setRejectOpen(true)}>
                  <XCircle className="h-4 w-4" />
                  반려
                </Button>
              </div>

              <div className="rounded-lg border border-line bg-white p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  <Clock3 className="h-3.5 w-3.5" />
                  Shortcuts
                </div>
                <div className="mt-3 space-y-2">
                  {shortcuts.map((item) => (
                    <div key={item.key} className="flex items-start gap-3 rounded-md bg-slate-50 px-3 py-2">
                      <kbd className="rounded border border-line bg-white px-2 py-0.5 text-[10px] font-semibold text-ink">
                        {item.key}
                      </kbd>
                      <div className="text-xs">
                        <p className="font-semibold">{item.label}</p>
                        <p className="mt-0.5 text-muted">{item.hint}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-line bg-slate-50 p-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Current segment</span>
                  <Badge tone="blue">#{activeIndex + 1}</Badge>
                </div>
                {currentSegment ? (
                  <>
                    <p className="mt-2 font-semibold text-ink">{currentSegment.timestamp}</p>
                    <p className="mt-1 text-muted">{currentSegment.text}</p>
                  </>
                ) : (
                  <p className="mt-2 text-muted">세그먼트를 선택하면 요약이 표시됩니다.</p>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="반려 사유 입력"
        description="반려 시 검토 사유가 기록됩니다."
      >
        <div className="space-y-4 p-5">
          <Field label="Reason">
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              className={textareaClass}
              placeholder="왜 이 초안이 반려되어야 하는지 적어주세요."
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRejectOpen(false)}>
              취소
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                toast.error("초안을 반려했습니다.", {
                  description: rejectReason || "사유가 기록되었습니다.",
                });
                setRejectReason("");
                setRejectOpen(false);
              }}
            >
              반려 확정
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/70 bg-white/80 px-3 py-2 shadow-sm backdrop-blur">
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-slate-50 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}

function TranscriptRow({
  segment,
  active,
  onClick,
}: {
  segment: TranscriptSegment;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border px-4 py-3 text-left transition ${
        active ? "border-clinical bg-blue-50/70 shadow-sm" : "border-line bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge tone={segment.speaker === "치료자" ? "blue" : "violet"}>{segment.speaker}</Badge>
          {segment.highlighted && <Badge tone="orange">하이라이트</Badge>}
        </div>
        <span className="text-[10px] text-muted">{segment.timestamp}</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-ink">{segment.text}</p>
    </button>
  );
}
