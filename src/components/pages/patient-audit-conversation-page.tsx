"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PatientShell } from "@/components/runtime/patient-shell";
import { Badge, Button, Card, EmptyState } from "@/components/ui/primitives";
import s01 from "../../../artifacts/session-fidelity/short-constrained-full-run/s01.json";
import s02 from "../../../artifacts/session-fidelity/short-constrained-full-run/s02.json";
import s03 from "../../../artifacts/session-fidelity/short-constrained-full-run/s03.json";
import s04 from "../../../artifacts/session-fidelity/short-constrained-full-run/s04.json";
import s05 from "../../../artifacts/session-fidelity/short-constrained-full-run/s05.json";
import s06 from "../../../artifacts/session-fidelity/short-constrained-full-run/s06.json";
import s07 from "../../../artifacts/session-fidelity/short-constrained-full-run/s07.json";
import s08 from "../../../artifacts/session-fidelity/short-constrained-full-run/s08.json";

type AuditMessage = { id: string; role: string; content: string; createdAt: string; promptItemId?: string };
type AuditReport = { sessionId: string; result: string; finalStatus: string; totalSubmissions: number; fallbackCount: number; providerErrorCount: number; messages: AuditMessage[] };

const REPORTS: Record<string, AuditReport> = { s01, s02, s03, s04, s05, s06, s07, s08 } as Record<string, AuditReport>;

export function PatientAuditConversationPage() {
  const pathname = usePathname();
  const slug = pathname.split("/").filter(Boolean).at(-1)?.toLowerCase() ?? "";
  const report = REPORTS[slug];
  if (!report) return <PatientShell title="Audit conversation"><Card><EmptyState title="Audit run not found" /></Card></PatientShell>;
  const messages = report.messages.filter((message) => ["assistant", "patient", "system", "clinician"].includes(message.role));
  return (
    <PatientShell
      title={`Verified audit · ${slug.toUpperCase()}`}
      sessionLabel="Synthetic patient"
      progressLabel="Read-only"
      actions={<Link href="/projects/demo/patient"><Button variant="secondary">Session List</Button></Link>}
    >
      <div className="space-y-4">
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={report.result === "pass" ? "success" : "warning"}>{report.result}</Badge>
            <Badge tone="neutral">{report.finalStatus}</Badge>
            <Badge tone="neutral">Patient inputs {report.totalSubmissions}</Badge>
            <Badge tone="neutral">Fallbacks {report.fallbackCount}</Badge>
            <Badge tone="neutral">Provider errors {report.providerErrorCount}</Badge>
          </div>
          <p className="mt-3 text-sm text-text-secondary">This is the de-identified automated full-run transcript imported from the local verification database. It is read-only and is not a real patient record.</p>
        </Card>
        <Card className="overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold text-text-primary">Conversation</h2>
            <p className="mt-1 text-sm text-text-secondary">Program messages appear on the left and simulated patient messages appear on the right.</p>
          </div>
          <div className="space-y-3 bg-surface-subtle/40 p-4 sm:p-5">
            {messages.map((message) => (
              <div key={message.id} className={`max-w-[88%] rounded-panel border px-4 py-3 ${message.role === "patient" ? "ml-auto border-clinical-blue-light bg-clinical-blue-light/60" : message.role === "system" ? "border-warning-light bg-warning-light/60" : "border-border bg-surface"}`}>
                <div className="text-[11px] font-semibold text-text-muted">{message.role === "assistant" ? "Program" : message.role === "patient" ? "You" : message.role}</div>
                <div className="mt-2 whitespace-pre-wrap break-words text-sm text-text-primary">{message.content}</div>
                {message.promptItemId && <div className="mt-2 text-[10px] text-text-muted">{message.promptItemId}</div>}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PatientShell>
  );
}
