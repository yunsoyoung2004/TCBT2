"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  FilePlus2,
  Play,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  PageSkeleton,
  ProtocolVersionBadge,
  SectionHeader,
  StatusBadge,
} from "@/components/ui/primitives";
import {
  getCriticalIssues,
  getDashboardSummary,
  getNextReviewItem,
  getProtocolReadiness,
  getRecentActivities,
  getReviewQueue,
  runValidation,
  type DashboardMetric,
  type ReadinessStage,
  type RecentActivityItem,
  type ReviewQueueItem,
} from "@/lib/api/mock-api";
import type { ValidationIssue } from "@/types";

type QueueFilter = "all" | "high" | "unassigned" | "clinical" | "safety";

export function DashboardPage() {
  const router = useRouter();
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");

  const summaryQuery = useQuery({ queryKey: ["dashboard-summary"], queryFn: getDashboardSummary });
  const readinessQuery = useQuery({ queryKey: ["dashboard-readiness"], queryFn: getProtocolReadiness });
  const queueQuery = useQuery({ queryKey: ["dashboard-review-queue"], queryFn: getReviewQueue });
  const blockersQuery = useQuery({ queryKey: ["dashboard-critical-issues"], queryFn: getCriticalIssues });
  const activityQuery = useQuery({ queryKey: ["dashboard-activity"], queryFn: getRecentActivities });

  const validationMutation = useMutation({
    mutationFn: runValidation,
    onSuccess: (result) => {
      toast.success(`Validation completed · score ${result.score}%`, {
        description: `${result.issues.filter((issue) => issue.severity === "critical").length} critical issues found`,
      });
      router.push("/projects/demo/protocols/tbct-br-001/validation");
    },
  });

  const reviewStartMutation = useMutation({
    mutationFn: getNextReviewItem,
    onSuccess: (item) => {
      if (!item) {
        toast("No pending review items.");
        return;
      }
      router.push(item.href);
    },
  });

  const isLoading =
    summaryQuery.isLoading ||
    readinessQuery.isLoading ||
    queueQuery.isLoading ||
    blockersQuery.isLoading ||
    activityQuery.isLoading;
  const hasError =
    summaryQuery.isError ||
    readinessQuery.isError ||
    queueQuery.isError ||
    blockersQuery.isError ||
    activityQuery.isError;

  const summary = summaryQuery.data;
  const readiness = useMemo(() => readinessQuery.data ?? [], [readinessQuery.data]);
  const criticalIssues = useMemo(() => blockersQuery.data ?? [], [blockersQuery.data]);
  const reviewQueue = useMemo(() => queueQuery.data ?? [], [queueQuery.data]);
  const activities = useMemo(() => activityQuery.data ?? [], [activityQuery.data]);

  const bottleneck = useMemo(() => findBottleneck(readiness), [readiness]);
  const filteredQueue = useMemo(() => filterQueue(reviewQueue, queueFilter), [reviewQueue, queueFilter]);

  if (isLoading || !summary) {
    return (
      <AppShell>
        <PageSkeleton />
      </AppShell>
    );
  }

  if (hasError) {
    return (
      <AppShell>
        <div className="p-4 lg:p-6">
          <Card>
            <ErrorState
              retry={() => {
                summaryQuery.refetch();
                readinessQuery.refetch();
                queueQuery.refetch();
                blockersQuery.refetch();
                activityQuery.refetch();
              }}
            />
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Protocol Command Center"
        title="TBCT Protocol Studio"
        description="A focused operational view for readiness, blockers, and the next best action."
        meta={
          <>
            <Badge tone="primary">{summary.projectName}</Badge>
            <Badge tone="neutral">Locale: {summary.locale}</Badge>
            <ProtocolVersionBadge version={summary.version} />
            <Badge tone="warning">{summary.status}</Badge>
          </>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => reviewStartMutation.mutate()} disabled={reviewStartMutation.isPending}>
              <ClipboardCheck className="h-4 w-4" />
              Start Review
            </Button>
            <Button
              variant="secondary"
              onClick={() => validationMutation.mutate()}
              disabled={validationMutation.isPending}
            >
              <ShieldCheck className="h-4 w-4" />
              Run Validation
            </Button>
          </div>
        }
      />

      <div className="space-y-5 p-4 lg:p-6">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.6fr)]">
          <OverviewStatusPanel
            summary={summary}
            bottleneck={bottleneck}
            onStartReview={() => reviewStartMutation.mutate()}
            onRunValidation={() => validationMutation.mutate()}
            isRunningValidation={validationMutation.isPending}
            isStartingReview={reviewStartMutation.isPending}
          />
          <NextActionPanel
            onOpenAssets={() => router.push("/projects/demo/clinical-assets/new")}
            onStartReview={() => reviewStartMutation.mutate()}
            onRunValidation={() => validationMutation.mutate()}
            onOpenEditor={() => router.push("/projects/demo/protocols/tbct-br-001/canvas")}
            isRunningValidation={validationMutation.isPending}
            isStartingReview={reviewStartMutation.isPending}
          />
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          {summary.metrics.map((metric) => (
            <MetricLinkCard key={metric.label} metric={metric} />
          ))}
        </section>

        <Card>
          <SectionHeader
            title="Protocol Readiness"
            description="Five-stage readiness including the current bottleneck"
          />
          <div className="grid gap-4 p-4 xl:grid-cols-5">
            {readiness.map((stage) => (
              <ReadinessStageCard
                key={stage.id}
                stage={stage}
                isBottleneck={bottleneck?.id === stage.id}
              />
            ))}
          </div>
          <div className="border-t border-border bg-surface-subtle px-4 py-3 text-xs text-text-secondary">
            Current bottleneck: {bottleneck?.label ?? "None"}. Clearing {summary.currentBottleneck.priorityReviews} priority reviews will significantly improve next-stage readiness.
          </div>
        </Card>

        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <BottleneckPanel summary={summary} bottleneck={bottleneck} />
          <DeploymentBlockersPanel issues={criticalIssues} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <ReviewQueueTable
            items={filteredQueue}
            activeFilter={queueFilter}
            onFilterChange={setQueueFilter}
          />
          <RecentActivityTimeline items={activities} />
        </div>
      </div>
    </AppShell>
  );
}

function OverviewStatusPanel({
  summary,
  bottleneck,
  onStartReview,
  onRunValidation,
  isRunningValidation,
  isStartingReview,
}: {
  summary: Awaited<ReturnType<typeof getDashboardSummary>>;
  bottleneck: ReadinessStage | null;
  onStartReview: () => void;
  onRunValidation: () => void;
  isRunningValidation: boolean;
  isStartingReview: boolean;
}) {
  const bottleneckProgress = bottleneck
    ? Math.round((bottleneck.completed / bottleneck.total) * 100)
    : summary.currentBottleneck.progress;

  return (
    <Card className="overflow-hidden">
      <div className="space-y-5 p-4 lg:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="warning">Current bottleneck</Badge>
          <span className="text-xs text-text-muted">Last sync {summary.lastUpdated}</span>
        </div>

        <div className="space-y-2">
          <h2 className="text-[1.55rem] font-semibold leading-tight text-text-primary lg:text-[1.85rem]">
            {bottleneck?.label ?? summary.currentBottleneck.label} needs attention first.
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-text-secondary">
            {summary.pendingReviews} review items and {summary.criticalIssues} critical validation issues remain before this protocol is ready for stable pilot operation.
          </p>
        </div>

        <div className="rounded-panel border border-border bg-surface-subtle p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.08em] text-text-secondary">Runtime readiness</div>
              <div className="mt-1 text-4xl font-semibold leading-none text-text-primary">{summary.runtimeReadiness}%</div>
            </div>
            <div className="text-right text-xs text-text-secondary">
              <div>Pending reviews: {summary.pendingReviews}</div>
              <div>Critical issues: {summary.criticalIssues}</div>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-hover">
            <div className="h-full rounded-full bg-clinical-blue" style={{ width: `${summary.runtimeReadiness}%` }} />
          </div>
          <p className="mt-3 text-xs leading-5 text-text-secondary">
            Expected pilot-ready after review closure and safety-rule linkage checks.
          </p>
        </div>

        <div className="space-y-3">
          {[
            { label: "Bottleneck progress", value: `${bottleneckProgress}%`, progress: bottleneckProgress, tone: "primary" as const },
            { label: "Pending reviews", value: `${summary.pendingReviews}`, progress: Math.min(100, summary.pendingReviews * 6), tone: "warning" as const },
            { label: "Critical issues", value: `${summary.criticalIssues}`, progress: Math.min(100, summary.criticalIssues * 50), tone: "critical" as const },
          ].map((item) => (
            <div key={item.label} className="rounded-panel border border-border bg-surface p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 text-xs font-semibold text-text-primary">{item.label}</div>
                <Badge tone={item.tone} className="shrink-0">{item.value}</Badge>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-hover">
                <div
                  className={`h-full rounded-full ${item.tone === "critical" ? "bg-critical" : item.tone === "warning" ? "bg-warning" : "bg-clinical-blue"}`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={onStartReview} disabled={isStartingReview}>
            <Play className="h-4 w-4" />
            Continue Review
          </Button>
          <Button variant="secondary" onClick={onRunValidation} disabled={isRunningValidation}>
            <ShieldCheck className="h-4 w-4" />
            Validate blockers
          </Button>
        </div>
      </div>
    </Card>
  );
}

function NextActionPanel({
  onOpenAssets,
  onStartReview,
  onRunValidation,
  onOpenEditor,
  isRunningValidation,
  isStartingReview,
}: {
  onOpenAssets: () => void;
  onStartReview: () => void;
  onRunValidation: () => void;
  onOpenEditor: () => void;
  isRunningValidation: boolean;
  isStartingReview: boolean;
}) {
  const actions = [
    {
      icon: <ClipboardCheck className="h-4 w-4" />,
      label: "Start Review",
      helper: "Open the highest-priority review item.",
      onClick: onStartReview,
      loading: isStartingReview,
      primary: true,
    },
    {
      icon: <ShieldCheck className="h-4 w-4" />,
      label: "Run Validation",
      helper: "Check release blockers.",
      onClick: onRunValidation,
      loading: isRunningValidation,
      primary: false,
    },
    {
      icon: <Workflow className="h-4 w-4" />,
      label: "Protocol Editor",
      helper: "Open the current canvas.",
      onClick: onOpenEditor,
      primary: false,
    },
    {
      icon: <FilePlus2 className="h-4 w-4" />,
      label: "Register Asset",
      helper: "Upload source material.",
      onClick: onOpenAssets,
      primary: false,
    },
  ];

  return (
    <Card className="p-5">
      <div className="text-[11px] uppercase tracking-[0.08em] text-text-muted">Next actions</div>
      <h2 className="mt-2 text-xl font-semibold text-text-primary">Keep the workflow moving</h2>
      <p className="mt-2 text-sm leading-6 text-text-secondary">
        The overview now shows fewer competing cards. Use these actions for the main operational path.
      </p>
      <div className="mt-5 space-y-2">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            disabled={action.loading}
            className={`flex w-full items-center gap-3 rounded-panel border p-3 text-left transition ${
              action.primary
                ? "border-clinical-blue bg-clinical-blue text-white hover:bg-[#2f5b9f]"
                : "border-border bg-surface hover:bg-surface-subtle"
            }`}
          >
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-panel ${action.primary ? "bg-white/15" : "bg-surface-subtle text-clinical-blue"}`}>
              {action.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block text-sm font-semibold ${action.primary ? "text-white" : "text-text-primary"}`}>
                {action.label}
              </span>
              <span className={`block text-xs ${action.primary ? "text-white/80" : "text-text-secondary"}`}>
                {action.loading ? "Working..." : action.helper}
              </span>
            </span>
            <ArrowRight className={`h-4 w-4 ${action.primary ? "text-white/80" : "text-text-muted"}`} />
          </button>
        ))}
      </div>
    </Card>
  );
}

function MetricLinkCard({ metric }: { metric: DashboardMetric }) {
  return (
    <Link
      href={metric.href}
      className="group rounded-panel border border-border bg-surface p-4 transition hover:border-clinical-blue-light hover:bg-surface-subtle"
    >
      <div className="flex items-center justify-between gap-2">
        <Badge tone={metric.tone}>{metric.label}</Badge>
        <ArrowRight className="h-4 w-4 text-text-muted transition group-hover:translate-x-0.5 group-hover:text-clinical-blue" />
      </div>
      <div className="mt-5 text-3xl font-semibold text-text-primary">{metric.value}</div>
      <div className="mt-2 min-h-10 text-xs leading-5 text-text-secondary">{metric.helper}</div>
    </Link>
  );
}

function ReadinessStageCard({
  stage,
  isBottleneck,
}: {
  stage: ReadinessStage;
  isBottleneck: boolean;
}) {
  const progress = Math.round((stage.completed / stage.total) * 100);
  return (
    <Link
      href={stage.href}
      className={`rounded-panel border p-4 transition hover:bg-surface-subtle ${isBottleneck ? "border-warning bg-warning-light/40" : "border-border bg-surface"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="mono text-[11px] text-text-muted">{String(stage.order).padStart(2, "0")}</span>
        <StatusBadge status={stage.status} />
      </div>
      <div className="mt-3 text-sm font-semibold text-text-primary">{stage.label}</div>
      <div className="mt-1 text-xs text-text-secondary">
        {stage.completed} / {stage.total} complete
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-hover">
        <div className={`h-full ${isBottleneck ? "bg-warning" : "bg-clinical-blue"}`} style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="font-semibold text-text-primary">{progress}%</span>
        {isBottleneck && <Badge tone="warning">Current Bottleneck</Badge>}
      </div>
    </Link>
  );
}

function BottleneckPanel({
  summary,
  bottleneck,
}: {
  summary: Awaited<ReturnType<typeof getDashboardSummary>>;
  bottleneck: ReadinessStage | null;
}) {
  return (
    <Card>
      <SectionHeader title="Current Bottleneck" description="The slowest current stage and immediate action" />
      <div className="space-y-4 p-4">
        <div>
          <div className="text-lg font-semibold text-text-primary">{bottleneck?.label ?? summary.currentBottleneck.label}</div>
          <div className="mt-1 text-sm text-text-secondary">
            {summary.currentBottleneck.progress}% · {summary.currentBottleneck.completed} / {summary.currentBottleneck.total} complete
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <InfoStat label="Pending Review" value={`${summary.currentBottleneck.pendingReviews}`} />
          <InfoStat label="Priority Review" value={`${summary.currentBottleneck.priorityReviews}`} />
          <InfoStat label="Next Action" value={summary.currentBottleneck.nextAction} />
        </div>
        <div className="rounded-panel border border-border bg-surface-subtle p-3 text-sm text-text-secondary">
          Unresolved work remains in this stage, blocking stable progression. Start clinical review first to clear the bottleneck.
        </div>
        <Link href={summary.currentBottleneck.href}>
          <Button><Play className="h-4 w-4" />Start Review</Button>
        </Link>
      </div>
    </Card>
  );
}

function DeploymentBlockersPanel({ issues }: { issues: ValidationIssue[] }) {
  return (
    <Card>
      <SectionHeader title="Deployment Blockers" description="Critical validation issues blocking release" action={<Link href="/projects/demo/protocols/tbct-br-001/validation"><Button size="sm" variant="secondary">Open in Validation Center</Button></Link>} />
      <div className="space-y-3 p-4">
        {issues.map((issue) => (
          <Link key={issue.id} href={`/projects/demo/protocols/tbct-br-001/validation?issue=${issue.id}`} className="block rounded-panel border border-critical-light bg-critical-light/30 p-3 hover:bg-critical-light/50">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-critical" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-critical">{issue.session} · {issue.stepId ?? "Global"}</div>
                <div className="mt-1 text-sm font-semibold text-text-primary">{issue.title}</div>
                <div className="mt-1 text-xs text-text-secondary">{issue.suggestedFix}</div>
              </div>
            </div>
          </Link>
        ))}
        {issues.length === 0 && <EmptyState title="No release-blocking issues" description="No critical severity issue is currently detected." />}
      </div>
    </Card>
  );
}

function ReviewQueueTable({
  items,
  activeFilter,
  onFilterChange,
}: {
  items: ReviewQueueItem[];
  activeFilter: QueueFilter;
  onFilterChange: (filter: QueueFilter) => void;
}) {
  const filters: { id: QueueFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "high", label: "High Priority" },
    { id: "unassigned", label: "Unassigned" },
    { id: "clinical", label: "Clinical Review" },
    { id: "safety", label: "Safety Review" },
  ];

  return (
    <Card>
      <SectionHeader
        title="Review Queue"
        description="Execution list prioritized to show the most important review items first"
        action={
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <Button
                key={filter.id}
                size="sm"
                variant={activeFilter === filter.id ? "primary" : "secondary"}
                onClick={() => onFilterChange(filter.id)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead className="border-b border-border bg-surface-subtle text-[11px] uppercase tracking-[0.08em] text-text-muted">
            <tr>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Session</th>
              <th className="px-4 py-3">Asset Type</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.slice(0, 5).map((item) => (
              <tr key={item.id} className="hover:bg-surface-subtle">
                <td className="px-4 py-3"><Badge tone={item.priority}>{item.priority}</Badge></td>
                <td className="px-4 py-3">
                  <div className="text-sm font-semibold text-text-primary">{item.title}</div>
                  <div className="mt-1 text-xs text-text-secondary">{item.type}</div>
                </td>
                <td className="px-4 py-3 text-sm text-text-secondary">{item.session}</td>
                <td className="px-4 py-3 text-sm text-text-secondary">{item.assetType}</td>
                <td className="px-4 py-3 text-sm text-text-secondary">{item.owner}</td>
                <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                <td className="px-4 py-3 text-sm text-text-secondary">{item.updatedAt}</td>
                <td className="px-4 py-3 text-right"><Link href={item.href}><Button size="sm" variant="secondary">Review Now</Button></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function RecentActivityTimeline({ items }: { items: RecentActivityItem[] }) {
  return (
    <Card>
      <SectionHeader title="Recent Activity" description="Timeline summary of the last 5-6 operations" />
      <div className="space-y-0 p-4">
        {items.slice(0, 6).map((item, index) => (
          <div key={item.id} className="flex gap-4 border-l border-border pl-4">
            <div className={`-ml-[25px] mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-xs font-semibold ${item.status === "success" ? "text-success" : item.status === "warning" ? "text-warning" : "text-clinical-blue"}`}>
              {item.initials}
            </div>
            <div className={index === items.length - 1 ? "pb-0" : "pb-5"}>
              <div className="text-sm text-text-primary">
                <span className="font-semibold">{item.action}</span> · {item.resource}
              </div>
              <div className="mt-1 text-xs text-text-secondary">{item.reason}</div>
              <div className="mt-2 text-[11px] text-text-muted">{item.timestamp}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-panel border border-border bg-surface-subtle p-3">
      <div className="text-[11px] uppercase tracking-[0.08em] text-text-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold text-text-primary">{value}</div>
    </div>
  );
}

function findBottleneck(stages: ReadinessStage[]): ReadinessStage | null {
  if (!stages.length) return null;
  return [...stages]
    .filter((stage) => stage.status === "review")
    .sort((a, b) => a.completed / a.total - b.completed / b.total)[0] ?? null;
}

function filterQueue(items: ReviewQueueItem[], filter: QueueFilter) {
  switch (filter) {
    case "high":
      return items.filter((item) => item.priority === "critical" || item.priority === "warning");
    case "unassigned":
      return items.filter((item) => item.owner.trim().length === 0);
    case "clinical":
      return items.filter((item) => item.type.includes("Clinical"));
    case "safety":
      return items.filter((item) => item.type.includes("Safety"));
    default:
      return items;
  }
}
