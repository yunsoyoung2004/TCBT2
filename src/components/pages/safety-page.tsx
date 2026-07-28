"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Lock,
  PencilLine,
  Plus,
  ShieldAlert,
  ShieldCheck,
  ToggleLeft,
} from "lucide-react";
import { toast } from "sonner";
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
import { getSafetyRules } from "@/lib/api/mock-api";
import type { SafetyRule } from "@/types";

export function SafetyPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["safety-rules"],
    queryFn: getSafetyRules,
  });

  const [rules, setRules] = useState<SafetyRule[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingRule, setPendingRule] = useState<SafetyRule | null>(null);
  const [draft, setDraft] = useState<SafetyRule | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "draft" | "review">("all");

  useEffect(() => {
    if (data) setRules(data);
  }, [data]);

  useEffect(() => {
    if (!selectedId && rules[0]) {
      setSelectedId(rules[0].id);
    }
  }, [rules, selectedId]);

  useEffect(() => {
    const current = rules.find((rule) => rule.id === selectedId) ?? null;
    setDraft(current);
  }, [rules, selectedId]);

  const visibleRules = useMemo(() => {
    return rules.filter((rule) => {
      if (filter === "all") return true;
      if (filter === "active") return rule.active;
      if (filter === "draft") return rule.status === "draft";
      if (filter === "review") return rule.status === "review";
      return true;
    });
  }, [filter, rules]);

  const metrics = useMemo(
    () => [
      { label: "Active rules", value: rules.filter((rule) => rule.active).length },
      { label: "High escalation", value: rules.filter((rule) => rule.escalation === "High").length },
      { label: "Covered sessions", value: new Set(rules.flatMap((rule) => rule.sessions)).size },
      { label: "Locked rules", value: rules.filter((rule) => !rule.active).length },
    ],
    [rules],
  );

  if (isLoading) {
    return (
      <AppShell title="Safety Rules" eyebrow="Protocol Guardrails">
        <PageSkeleton />
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell title="Safety Rules" eyebrow="Protocol Guardrails">
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
      title="Safety Rules"
      eyebrow="Protocol Guardrails"
      actions={
        <>
          <Button variant="secondary">
            <Eye className="h-4 w-4" />
            Preview impact
          </Button>
          <Button>
            <Plus className="h-4 w-4" />
            New rule
          </Button>
        </>
      }
    >
      <div className="space-y-4 p-4 lg:p-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.label} className="p-4">
              <div className="text-[10px] uppercase tracking-wide text-muted">{metric.label}</div>
              <div className="mt-2 text-2xl font-semibold text-ink">{metric.value}</div>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.45fr_.9fr]">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold">Rules list</h3>
                <p className="mt-1 text-xs text-muted">세션별 안전 규칙과 현재 활성 상태를 확인합니다.</p>
              </div>
              <div className="flex items-center gap-2">
                {(["all", "active", "review", "draft"] as const).map((item) => (
                  <Button
                    key={item}
                    size="sm"
                    variant={filter === item ? "primary" : "secondary"}
                    onClick={() => setFilter(item)}
                  >
                    {item === "all" ? "전체" : item === "active" ? "활성" : item === "review" ? "검토" : "초안"}
                  </Button>
                ))}
              </div>
            </div>
            <div className="divide-y divide-line">
              {visibleRules.map((rule) => (
                <button
                  key={rule.id}
                  onClick={() => setSelectedId(rule.id)}
                  className={`w-full px-4 py-4 text-left transition ${
                    selectedId === rule.id ? "bg-blue-50/60" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={rule.escalation === "High" ? "red" : rule.escalation === "Medium" ? "orange" : "blue"}>
                          {rule.id}
                        </Badge>
                        <StatusBadge status={rule.status} />
                        {rule.active ? (
                          <Badge tone="green">Active</Badge>
                        ) : (
                          <Badge tone="gray">Locked</Badge>
                        )}
                      </div>
                      <p className="mt-2 text-sm font-semibold text-ink">{rule.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{rule.trigger}</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <StatMini label="Escalation" value={rule.escalation} />
                      <StatMini label="Sessions" value={rule.sessions.join(", ")} />
                      <StatMini label="Updated" value={rule.updatedAt} />
                    </div>
                  </div>
                </button>
              ))}
              {visibleRules.length === 0 && (
                <EmptyState title="조건에 맞는 규칙이 없습니다." description="필터를 조정해 주세요." />
              )}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold">Rule editor</h3>
                <p className="mt-1 text-xs text-muted">선택한 규칙을 편집합니다.</p>
              </div>
              <ShieldCheck className="h-4 w-4 text-success" />
            </div>
            <div className="space-y-4 p-4">
              {!draft ? (
                <EmptyState title="규칙을 선택해 주세요." />
              ) : (
                <>
                  <div className="rounded-lg border border-line bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-muted">Current state</div>
                        <p className="mt-1 text-sm font-semibold text-ink">{draft.title}</p>
                      </div>
                      <Lock className="h-4 w-4 text-clinical" />
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      {draft.active ? "규칙이 활성화되어 있습니다." : "비활성 규칙입니다."}
                    </p>
                  </div>

                  <Field label="Rule title">
                    <input
                      value={draft.title}
                      onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Trigger">
                    <textarea
                      value={draft.trigger}
                      onChange={(event) => setDraft({ ...draft, trigger: event.target.value })}
                      className={textareaClass}
                    />
                  </Field>
                  <Field label="Action">
                    <textarea
                      value={draft.action}
                      onChange={(event) => setDraft({ ...draft, action: event.target.value })}
                      className={textareaClass}
                    />
                  </Field>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Escalation">
                      <select
                        value={draft.escalation}
                        onChange={(event) =>
                          setDraft({ ...draft, escalation: event.target.value as SafetyRule["escalation"] })
                        }
                        className={inputClass}
                      >
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                      </select>
                    </Field>
                    <Field label="Status">
                      <select
                        value={draft.status}
                        onChange={(event) => setDraft({ ...draft, status: event.target.value as SafetyRule["status"] })}
                        className={inputClass}
                      >
                        <option value="draft">draft</option>
                        <option value="review">review</option>
                        <option value="approved">approved</option>
                        <option value="error">error</option>
                        <option value="published">published</option>
                      </select>
                    </Field>
                  </div>

                  <div className="grid gap-2">
                    <Button
                      onClick={() => {
                        setRules((current) => current.map((rule) => (rule.id === draft.id ? draft : rule)));
                        setSelectedId(draft.id);
                        toast.success("안전 규칙을 저장했습니다.");
                      }}
                    >
                      <PencilLine className="h-4 w-4" />
                      Save rule
                    </Button>
                    <Button
                      variant={draft.active ? "secondary" : "primary"}
                      onClick={() => {
                        if (draft.active) {
                          setPendingRule(draft);
                          setConfirmOpen(true);
                          return;
                        }
                        const next = { ...draft, active: true };
                        setDraft(next);
                        setRules((current) => current.map((rule) => (rule.id === next.id ? next : rule)));
                        toast.success("규칙을 활성화했습니다.");
                      }}
                    >
                      <ToggleLeft className="h-4 w-4" />
                      {draft.active ? "Deactivate" : "Activate"}
                    </Button>
                  </div>

                  <div className="rounded-lg border border-line bg-white p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      Sessions
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {draft.sessions.map((session) => (
                        <Badge key={session} tone="blue">
                          {session}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-line bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Guardrail note
                    </div>
                    <p className="mt-2 text-xs leading-6 text-muted">
                      When this rule fires in live protocol execution, the runtime should pause, display the escalation message, and require clinician confirmation before proceeding.
                    </p>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="규칙 비활성화 확인"
        description="활성 규칙을 끄면 런타임 경고가 더 이상 적용되지 않습니다."
      >
        <div className="space-y-4 p-5">
          <p className="text-sm text-muted">
            {pendingRule?.title}을(를) 비활성화할까요?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              취소
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (pendingRule) {
                  const next = { ...pendingRule, active: false };
                  setRules((current) => current.map((rule) => (rule.id === pendingRule.id ? next : rule)));
                  setDraft(next);
                  toast.error("규칙을 비활성화했습니다.");
                }
                setPendingRule(null);
                setConfirmOpen(false);
              }}
            >
              비활성화
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-slate-50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-[11px] font-semibold text-ink">{value}</div>
    </div>
  );
}
