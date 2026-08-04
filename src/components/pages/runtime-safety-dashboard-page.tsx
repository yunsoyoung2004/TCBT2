"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { Badge, Button, Card, PageHeader, PageSkeleton } from "@/components/ui/primitives";
import { getSafetyDashboardData } from "@/lib/api/safety-operations-api";

export function RuntimeSafetyDashboardPage() {
  const query = useQuery({ queryKey: ["safety-dashboard"], queryFn: getSafetyDashboardData });
  if (query.isLoading) return <AppShell><PageSkeleton /></AppShell>;
  const data = query.data!;
  return (
    <AppShell>
      <PageHeader title="Safety Operations" description="Operational queue, holds, follow-ups, and human oversight across runtime safety events." eyebrow="Stage 4" actions={<><Link href="/runtime/safety/events"><Button variant="secondary">Event Queue</Button></Link><Link href="/runtime/safety/follow-ups"><Button variant="secondary">Follow-ups</Button></Link></>} />
      <div className="grid gap-4 p-4 lg:grid-cols-4 lg:p-6">
        <Kpi label="Open Safety Events" value={data.open} />
        <Kpi label="Immediate" value={data.immediate} tone="critical" />
        <Kpi label="Sessions on Hold" value={data.sessionsOnHold} tone="warning" />
        <Kpi label="Overdue Follow-ups" value={data.overdueFollowUps} tone="critical" />
      </div>
      <div className="grid gap-4 p-4 lg:grid-cols-2 lg:p-6">
        <Card className="p-4">
          <div className="text-sm font-semibold text-text-primary">Immediate attention</div>
          <div className="mt-3 space-y-2">
            {data.events.filter((item) => item.urgency === "immediate" || item.urgency === "urgent").slice(0, 6).map((item) => (
              <Link key={item.id} href={`/runtime/safety/events/${item.id}`} className="block rounded-panel border border-border p-3">
                <div className="flex gap-2"><Badge tone={item.severity === "high" ? "critical" : "warning"}>{item.severity}</Badge><Badge tone="neutral">{item.status}</Badge></div>
                <div className="mt-2 text-sm text-text-primary">{item.triggerSummary}</div>
              </Link>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm font-semibold text-text-primary">Recent safety activity</div>
          <div className="mt-3 space-y-2">
            {data.events.slice(0, 6).map((item) => (
              <div key={item.id} className="rounded-panel border border-border p-3">
                <div className="text-xs text-text-muted">{item.createdAt}</div>
                <div className="mt-1 text-sm text-text-primary">{item.triggerSummary}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function Kpi({ label, value, tone = "primary" }: { label: string; value: number; tone?: "primary" | "warning" | "critical" }) {
  return <Card className="p-4"><div className="text-[11px] uppercase tracking-[0.08em] text-text-muted">{label}</div><div className="mt-2 flex items-center gap-2"><div className="text-2xl font-semibold text-text-primary">{value}</div><Badge tone={tone}>{label.split(" ")[0]}</Badge></div></Card>;
}
