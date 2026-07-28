"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ClipboardCheck,
  Filter,
  Search,
  UserCircle2,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import {
  Badge,
  Card,
  Drawer,
  EmptyState,
  ErrorState,
  PageSkeleton,
} from "@/components/ui/primitives";
import { getAuditEntries } from "@/lib/api/mock-api";
import { cn } from "@/lib/utils";
import type { AuditEntry } from "@/types";

export function AuditPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["audit-log"],
    queryFn: getAuditEntries,
  });

  const entries = useMemo(() => data ?? [], [data]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const [resourceFilter, setResourceFilter] = useState("all");

  const resources = useMemo(() => {
    return Array.from(new Set(entries.map((entry) => entry.resource))).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return entries.filter((entry) => {
      const matchesQuery =
        !q ||
        entry.action.toLowerCase().includes(q) ||
        entry.resource.toLowerCase().includes(q) ||
        entry.user.toLowerCase().includes(q) ||
        entry.reason.toLowerCase().includes(q);
      const matchesResource = resourceFilter === "all" || entry.resource === resourceFilter;
      return matchesQuery && matchesResource;
    });
  }, [entries, resourceFilter, search]);

  if (isLoading) {
    return (
      <AppShell title="Audit Log" eyebrow="Compliance Trace">
        <PageSkeleton />
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell title="Audit Log" eyebrow="Compliance Trace">
        <div className="p-4 lg:p-6">
          <Card>
            <ErrorState retry={refetch} />
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Audit Log" eyebrow="Compliance Trace">
      <div className="space-y-4 p-4 lg:p-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="p-4">
            <div className="text-[10px] uppercase tracking-wide text-muted">Entries</div>
            <div className="mt-2 text-3xl font-semibold text-ink">{entries.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-[10px] uppercase tracking-wide text-muted">Users</div>
            <div className="mt-2 text-3xl font-semibold text-ink">{new Set(entries.map((entry) => entry.user)).size}</div>
          </Card>
          <Card className="p-4">
            <div className="text-[10px] uppercase tracking-wide text-muted">Resources</div>
            <div className="mt-2 text-3xl font-semibold text-ink">{resources.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-[10px] uppercase tracking-wide text-muted">Filtered</div>
            <div className="mt-2 text-3xl font-semibold text-ink">{filtered.length}</div>
          </Card>
        </div>

        <Card className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-9 w-full rounded-md border border-line bg-white pl-9 pr-3 text-sm"
                placeholder="Search user, action, resource, or reason"
              />
            </div>
            <select
              value={resourceFilter}
              onChange={(event) => setResourceFilter(event.target.value)}
              className="h-9 rounded-md border border-line bg-white px-3 text-sm"
            >
              <option value="all">All resources</option>
              {resources.map((resource) => (
                <option key={resource} value={resource}>
                  {resource}
                </option>
              ))}
            </select>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold">Change history</h3>
              <p className="mt-1 text-xs text-muted">모든 변경 사항은 감사 로그에 남습니다.</p>
            </div>
            <Badge tone="blue">{filtered.length} rows</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-xs">
              <thead className="border-b border-line bg-slate-50 text-[10px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-3 py-3">User</th>
                  <th className="px-3 py-3">Action</th>
                  <th className="px-3 py-3">Resource</th>
                  <th className="px-3 py-3">Version</th>
                  <th className="px-5 py-3 text-right">Open</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((entry) => (
                  <tr
                    key={entry.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => setSelected(entry)}
                  >
                    <td className="px-5 py-4 font-medium text-ink">{entry.timestamp}</td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-[10px] font-semibold text-clinical">
                          {entry.initials}
                        </span>
                        {entry.user}
                      </div>
                    </td>
                    <td className="px-3 py-4">{entry.action}</td>
                    <td className="px-3 py-4">
                      <Badge tone="blue">{entry.resource}</Badge>
                    </td>
                    <td className="px-3 py-4 text-muted">{entry.version}</td>
                    <td className="px-5 py-4 text-right">
                      <ArrowRight className="inline h-4 w-4 text-slate-300" />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8">
                      <EmptyState title="조건에 맞는 로그가 없습니다." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Audit detail"
        width="w-[560px]"
      >
        {selected && (
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-clinical" />
                <span className="text-sm font-semibold">{selected.action}</span>
              </div>
              <p className="mt-2 text-xs text-muted">{selected.timestamp}</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted">User</div>
                  <div className="mt-1 text-sm font-semibold text-ink">{selected.user}</div>
                </div>
                <UserCircle2 className="h-4 w-4 text-clinical" />
              </div>
            </Card>

            <DiffBlock label="Previous value" value={selected.previousValue} />
            <DiffBlock label="New value" value={selected.newValue} />

            <Card className="p-4">
              <div className="text-[10px] uppercase tracking-wide text-muted">Reason</div>
              <p className="mt-1 text-sm leading-6 text-ink">{selected.reason}</p>
            </Card>

            <Card className="p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <MiniInfo label="Resource" value={selected.resource} />
                <MiniInfo label="Version" value={selected.version} />
              </div>
            </Card>
          </div>
        )}
      </Drawer>
    </AppShell>
  );
}

function DiffBlock({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <pre className="mt-2 overflow-auto rounded-lg bg-slate-50 p-3 text-xs leading-6 text-ink">{value}</pre>
    </Card>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-slate-50 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}
