"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertOctagon,
  ArrowRight,
  CheckCircle2,
  CircleSlash2,
  Info,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  ErrorState,
  PageSkeleton,
} from "@/components/ui/primitives";
import { validateProtocol } from "@/lib/api/mock-api";
import type { ValidationIssue } from "@/types";

export function ValidationPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["protocol-validation"],
    queryFn: validateProtocol,
  });

  const [selectedIssue, setSelectedIssue] = useState<ValidationIssue | null>(null);

  const issues = useMemo(() => data?.issues ?? [], [data?.issues]);
  const score = data?.score ?? 0;

  const counts = useMemo(() => {
    return {
      critical: issues.filter((item) => item.severity === "critical").length,
      warning: issues.filter((item) => item.severity === "warning").length,
      info: issues.filter((item) => item.severity === "info").length,
      passed: 38,
    };
  }, [issues]);

  if (isLoading) {
    return (
      <AppShell title="Validation" eyebrow="Quality Health">
        <PageSkeleton />
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell title="Validation" eyebrow="Quality Health">
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
      title="Validation"
      eyebrow="Quality Health"
      actions={
        <>
          <Button
            variant="secondary"
            loading={isFetching}
            onClick={() => {
              refetch();
              toast.success("검증을 다시 실행했습니다.");
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Re-run
          </Button>
          <Button
            variant="secondary"
            onClick={() => router.push("/projects/demo/protocols/tbct-br-001/canvas")}
          >
            <ShieldCheck className="h-4 w-4" />
            Open canvas
          </Button>
        </>
      }
    >
      <div className="space-y-4 p-4 lg:p-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Card className="p-4 xl:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted">Validation score</div>
                <div className="mt-2 text-4xl font-semibold text-ink">{score}%</div>
                <p className="mt-1 text-xs text-muted">Protocol readiness for release</p>
              </div>
              <div
                className="flex h-24 w-24 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(#315fad ${score}%, #e7edf5 0)`,
                }}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-sm font-semibold text-navy">
                  {score}%
                </div>
              </div>
            </div>
          </Card>
          <StatCard label="Critical" value={counts.critical} tone="red" icon={AlertOctagon} />
          <StatCard label="Warnings" value={counts.warning} tone="orange" icon={TriangleAlert} />
          <StatCard label="Info" value={counts.info} tone="blue" icon={Info} />
          <StatCard label="Passed" value={counts.passed} tone="green" icon={CheckCircle2} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.45fr_.85fr]">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold">Issues</h3>
                <p className="mt-1 text-xs text-muted">검증에서 확인된 항목을 우선순위별로 확인합니다.</p>
              </div>
              <Badge tone="red">{issues.length} findings</Badge>
            </div>
            <div className="divide-y divide-line">
              {issues.map((issue) => (
                <button
                  key={issue.id}
                  onClick={() => setSelectedIssue(issue)}
                  className="w-full px-4 py-4 text-left transition hover:bg-slate-50"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <SeverityBadge severity={issue.severity} />
                        <Badge tone="blue">{issue.category}</Badge>
                        {issue.stepId && <Badge tone="violet">{issue.stepId}</Badge>}
                      </div>
                      <p className="mt-2 text-sm font-semibold text-ink">{issue.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{issue.description}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <span>{issue.location}</span>
                      <ArrowRight className="h-4 w-4 text-slate-300" />
                    </div>
                  </div>
                </button>
              ))}
              {issues.length === 0 && (
                <EmptyState title="이슈가 없습니다." description="현재 검증 기준에서는 막히는 항목이 없습니다." />
              )}
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Health breakdown</h3>
                <Badge tone="green">86 ready</Badge>
              </div>
              <div className="mt-4 space-y-3">
                <BarMetric label="Critical blockers" value={counts.critical} max={10} tone="red" />
                <BarMetric label="Warnings" value={counts.warning} max={15} tone="orange" />
                <BarMetric label="Information" value={counts.info} max={20} tone="blue" />
                <BarMetric label="Passed" value={counts.passed} max={40} tone="green" />
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-semibold">Recommended next actions</h3>
              <div className="mt-3 space-y-2">
                {[
                  "Fix STEP-07 safety escalation path",
                  "Review missing source links on STEP-04",
                  "Confirm branch labels for STEP-09",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                    <CircleSlash2 className="mt-0.5 h-4 w-4 text-warning" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Drawer
        open={!!selectedIssue}
        onClose={() => setSelectedIssue(null)}
        title="Validation detail"
        width="w-[520px]"
      >
        {selectedIssue && (
          <div className="space-y-4">
            <div className="rounded-lg border border-line bg-slate-50 p-4">
              <SeverityBadge severity={selectedIssue.severity} />
              <p className="mt-3 text-sm font-semibold text-ink">{selectedIssue.title}</p>
              <p className="mt-2 text-xs text-muted">{selectedIssue.description}</p>
            </div>

            <Card className="p-4">
              <div className="text-[10px] uppercase tracking-wide text-muted">Location</div>
              <p className="mt-1 text-sm font-semibold text-ink">{selectedIssue.location}</p>
              <p className="mt-2 text-xs text-muted">Category: {selectedIssue.category}</p>
            </Card>

            <Card className="p-4">
              <div className="text-[10px] uppercase tracking-wide text-muted">Quick action</div>
              <div className="mt-3 grid gap-2">
                <Button
                  onClick={() => {
                    if (selectedIssue.stepId) {
                      router.push(`/projects/demo/protocols/tbct-br-001/canvas?step=${selectedIssue.stepId}`);
                    }
                  }}
                  disabled={!selectedIssue.stepId}
                >
                  Go to node
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    toast.success("이슈를 할당 대기열에 넣었습니다.");
                  }}
                >
                  Assign reviewer
                </Button>
              </div>
            </Card>
          </div>
        )}
      </Drawer>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: "red" | "orange" | "blue" | "green";
  icon: typeof AlertOctagon;
}) {
  const palette: Record<typeof tone, string> = {
    red: "bg-red-50 text-critical",
    orange: "bg-orange-50 text-warning",
    blue: "bg-blue-50 text-clinical",
    green: "bg-emerald-50 text-success",
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${palette[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
        <Badge tone={tone}>{label}</Badge>
      </div>
      <div className="mt-4 text-3xl font-semibold text-ink">{value}</div>
    </Card>
  );
}

function SeverityBadge({ severity }: { severity: ValidationIssue["severity"] }) {
  const tone =
    severity === "critical" ? "red" : severity === "warning" ? "orange" : severity === "info" ? "blue" : "green";
  return <Badge tone={tone}>{severity.toUpperCase()}</Badge>;
}

function BarMetric({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: "red" | "orange" | "blue" | "green";
}) {
  const palette: Record<typeof tone, string> = {
    red: "bg-critical",
    orange: "bg-warning",
    blue: "bg-clinical",
    green: "bg-success",
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium text-ink">{label}</span>
        <span className="text-muted">
          {value}/{max}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${palette[tone]}`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  );
}
