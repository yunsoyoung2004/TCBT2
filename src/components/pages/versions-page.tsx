"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Copy,
  Download,
  FileClock,
  Globe2,
  Layers3,
  Play,
  Rocket,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Badge, Button, Card, EmptyState, ErrorState, Modal, PageSkeleton, textareaClass } from "@/components/ui/primitives";
import { getVersions, publishProtocol } from "@/lib/api/mock-api";
import { cn } from "@/lib/utils";
import type { ProtocolVersion } from "@/types";

export function VersionsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["protocol-versions"],
    queryFn: getVersions,
  });

  const versions = useMemo(() => data ?? [], [data]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [publishOpen, setPublishOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [releaseTarget, setReleaseTarget] = useState<"staging" | "production">("staging");
  const [releaseNotes, setReleaseNotes] = useState("Clinician-reviewed release candidate.");
  const [receipt, setReceipt] = useState<Awaited<ReturnType<typeof publishProtocol>> | null>(null);

  useEffect(() => {
    if (versions.length && !selectedId) {
      setSelectedId(versions[0].id);
    }
  }, [selectedId, versions]);

  const selected = versions.find((version) => version.id === selectedId) ?? versions[0];
  const previous = useMemo(() => {
    if (!selected) return null;
    const index = versions.findIndex((version) => version.id === selected.id);
    return index >= 0 ? versions[index + 1] ?? null : null;
  }, [selected, versions]);

  const publishMutation = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("No version selected");
      return publishProtocol(selected.version, releaseTarget);
    },
    onSuccess: (result) => {
      setReceipt(result);
      setPublishOpen(false);
      setReceiptOpen(true);
      toast.success("릴리스를 발행했습니다.");
    },
  });

  if (isLoading) {
    return (
      <AppShell title="Versions & Releases" eyebrow="Release Management">
        <PageSkeleton />
      </AppShell>
    );
  }

  if (isError) {
    return (
      <AppShell title="Versions & Releases" eyebrow="Release Management">
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
      title="Versions & Releases"
      eyebrow="Release Management"
      actions={
        <>
          <Button variant="secondary" onClick={() => toast.success("릴리스 노트를 내려받았습니다.")}>
            <Download className="h-4 w-4" />
            Export notes
          </Button>
          <Button onClick={() => setPublishOpen(true)}>
            <Rocket className="h-4 w-4" />
            Publish release
          </Button>
        </>
      }
    >
      <div className="space-y-4 p-4 lg:p-6">
        <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr]">
          <Card className="overflow-hidden">
            <div className="border-b border-line px-4 py-3">
              <h3 className="text-sm font-semibold">Version timeline</h3>
              <p className="mt-1 text-xs text-muted">각 버전의 스냅샷과 상태를 확인합니다.</p>
            </div>
            <div className="divide-y divide-line">
              {versions.map((version) => (
                <button
                  key={version.id}
                  onClick={() => setSelectedId(version.id)}
                  className={cn(
                    "w-full px-4 py-4 text-left transition",
                    selected?.id === version.id ? "bg-blue-50/70" : "hover:bg-slate-50",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge tone="blue">{version.version}</Badge>
                        <Badge tone={version.status === "Published" ? "green" : version.status === "Clinical Review" ? "orange" : "gray"}>
                          {version.status}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-ink">{version.author}</p>
                      <p className="mt-1 text-xs text-muted">{version.date}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-right text-xs">
                      <MiniStat label="Nodes" value={`${version.nodes}`} />
                      <MiniStat label="Changes" value={`${version.changes.added + version.changes.modified + version.changes.removed}`} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Selected version</h3>
                  <p className="mt-1 text-xs text-muted">선택한 버전의 변경 내역을 확인합니다.</p>
                </div>
                <Layers3 className="h-4 w-4 text-clinical" />
              </div>

              {selected ? (
                <>
                  <div className="mt-4 rounded-lg border border-line bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <Badge tone="blue">{selected.version}</Badge>
                      <Badge tone={selected.status === "Published" ? "green" : selected.status === "Clinical Review" ? "orange" : "gray"}>
                        {selected.status}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-ink">{selected.author}</p>
                    <p className="mt-1 text-xs text-muted">{selected.date}</p>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <StatBox label="Added" value={`${selected.changes.added}`} tone="green" />
                    <StatBox label="Modified" value={`${selected.changes.modified}`} tone="blue" />
                    <StatBox label="Removed" value={`${selected.changes.removed}`} tone="red" />
                    <StatBox label="Edges" value={`${selected.changes.edges}`} tone="violet" />
                  </div>

                  <div className="mt-4 rounded-lg border border-line bg-white p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      <Sparkles className="h-3.5 w-3.5" />
                      Compare with previous
                    </div>
                    {previous ? (
                      <div className="mt-3 space-y-2 text-xs text-muted">
                        <p>
                          Previous: <span className="font-semibold text-ink">{previous.version}</span>
                        </p>
                        <p>Node delta: {selected.nodes - previous.nodes > 0 ? "+" : ""}
                          {selected.nodes - previous.nodes}
                        </p>
                        <p>Added {selected.changes.added}, modified {selected.changes.modified}, removed {selected.changes.removed}</p>
                      </div>
                    ) : (
                      <EmptyState title="비교 대상이 없습니다." />
                    )}
                  </div>
                </>
              ) : (
                <EmptyState title="버전을 선택해 주세요." />
              )}
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Release target</h3>
                <Globe2 className="h-4 w-4 text-clinical" />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Badge tone="blue">Staging ready</Badge>
                <Badge tone="orange">Production gated</Badge>
              </div>
              <p className="mt-3 text-xs leading-6 text-muted">
                Publishing creates a release receipt and freezes the current version snapshot for auditability.
              </p>
            </Card>
          </div>
        </div>
      </div>

      <Modal
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        title="Publish release"
        description="선택한 버전을 배포 가능한 릴리스로 발행합니다."
        width="max-w-2xl"
      >
        <div className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-1.5 text-xs font-semibold text-slate-700">Target</div>
              <select value={releaseTarget} onChange={(e) => setReleaseTarget(e.target.value as "staging" | "production")} className="h-9 w-full rounded-md border border-line bg-white px-3 text-sm">
                <option value="staging">Staging</option>
                <option value="production">Production</option>
              </select>
            </div>
            <div>
              <div className="mb-1.5 text-xs font-semibold text-slate-700">Version</div>
              <input value={selected?.version ?? ""} readOnly className="h-9 w-full rounded-md border border-line bg-slate-50 px-3 text-sm" />
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-xs font-semibold text-slate-700">Release notes</div>
            <textarea value={releaseNotes} onChange={(e) => setReleaseNotes(e.target.value)} className={textareaClass} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPublishOpen(false)}>
              취소
            </Button>
            <Button loading={publishMutation.isPending} onClick={() => publishMutation.mutate()}>
              <Play className="h-4 w-4" />
              Publish
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        title="Release receipt"
        description="발행 결과와 해시를 보관하세요."
        width="max-w-2xl"
      >
        {receipt && (
          <div className="space-y-4 p-5">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <Badge tone="green">{receipt.releaseId}</Badge>
                <CheckCircle2 className="h-4 w-4 text-success" />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <ReceiptField label="Version" value={receipt.version} />
                <ReceiptField label="Target" value={receipt.target} />
                <ReceiptField label="Published" value={receipt.publishedAt} />
                <ReceiptField label="Checksum" value={receipt.checksum} />
              </div>
            </Card>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(receipt, null, 2));
                  toast.success("릴리스 영수증을 복사했습니다.");
                }}
              >
                <Copy className="h-4 w-4" />
                Copy receipt
              </Button>
              <Button onClick={() => setReceiptOpen(false)}>닫기</Button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}

function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "blue" | "red" | "violet";
}) {
  const palette: Record<typeof tone, string> = {
    green: "bg-emerald-50 text-success",
    blue: "bg-blue-50 text-clinical",
    red: "bg-red-50 text-critical",
    violet: "bg-violet-50 text-violet",
  };
  return (
    <div className={`rounded-lg border border-line px-3 py-3 ${palette[tone]}`}>
      <div className="text-[10px] uppercase tracking-wide">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function ReceiptField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-slate-50 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 break-all text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-slate-50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-xs font-semibold text-ink">{value}</div>
    </div>
  );
}
