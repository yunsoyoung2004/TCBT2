"use client";

import { useState } from "react";
import { Bell, Globe2, KeyRound, Save, Shield, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Badge, Button, Card, Field, inputClass, textareaClass } from "@/components/ui/primitives";

export function SettingsPage() {
  const [workspaceName, setWorkspaceName] = useState("TBCT Protocol Studio");
  const [owner, setOwner] = useState("Clinical Operations");
  const [timezone, setTimezone] = useState("Asia/Seoul");
  const [locale, setLocale] = useState("ko-KR");
  const [retention, setRetention] = useState("180");
  const [notes, setNotes] = useState("Production release requires clinical approval.");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [auditAlerts, setAuditAlerts] = useState(true);

  return (
    <AppShell
      title="Settings"
      eyebrow="Workspace Controls"
      actions={
        <Button
          onClick={() => {
            toast.success("설정을 저장했습니다.");
          }}
        >
          <Save className="h-4 w-4" />
          Save changes
        </Button>
      }
    >
      <div className="space-y-4 p-4 lg:p-6">
        <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <UserCircle2 className="h-4 w-4 text-clinical" />
              <h3 className="text-sm font-semibold">Workspace profile</h3>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Workspace name">
                <input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} className={inputClass} />
              </Field>
              <Field label="Owner">
                <input value={owner} onChange={(event) => setOwner(event.target.value)} className={inputClass} />
              </Field>
              <Field label="Timezone">
                <select value={timezone} onChange={(event) => setTimezone(event.target.value)} className={inputClass}>
                  <option>Asia/Seoul</option>
                  <option>America/New_York</option>
                  <option>Europe/London</option>
                </select>
              </Field>
              <Field label="Locale">
                <select value={locale} onChange={(event) => setLocale(event.target.value)} className={inputClass}>
                  <option>ko-KR</option>
                  <option>en-US</option>
                  <option>ja-JP</option>
                </select>
              </Field>
              <Field label="Data retention (days)">
                <input value={retention} onChange={(event) => setRetention(event.target.value)} className={inputClass} />
              </Field>
              <Field label="Release note">
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className={textareaClass} />
              </Field>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-clinical" />
              <h3 className="text-sm font-semibold">Security & compliance</h3>
            </div>
            <div className="mt-4 space-y-3">
              <ToggleRow
                label="Email alerts"
                note="Receive release, validation, and audit notifications."
                checked={emailAlerts}
                onChange={setEmailAlerts}
              />
              <ToggleRow
                label="Security alerts"
                note="Trigger alerts for critical protocol safety changes."
                checked={securityAlerts}
                onChange={setSecurityAlerts}
              />
              <ToggleRow
                label="Audit export reminders"
                note="Prompt the team to export audit bundles weekly."
                checked={auditAlerts}
                onChange={setAuditAlerts}
              />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <InfoCard icon={Globe2} label="Region" value="Korea / US hybrid" />
              <InfoCard icon={KeyRound} label="Access" value="Role-based access" />
              <InfoCard icon={Bell} label="Notifications" value="Real-time enabled" />
              <InfoCard icon={Shield} label="Policy" value="Clinical approval required" />
            </div>
          </Card>
        </div>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Publishing policy</h3>
              <p className="mt-1 text-xs text-muted">릴리스와 검증에 필요한 기본 정책을 제어합니다.</p>
            </div>
            <Badge tone="orange">Protected</Badge>
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <PolicyCard title="Draft workspace" text="All changes start in a private draft context before release." />
            <PolicyCard title="Review gate" text="Clinical review is required before the publish button becomes active." />
            <PolicyCard title="Audit retention" text="Audit bundles remain searchable for the retention window." />
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function ToggleRow({
  label,
  note,
  checked,
  onChange,
}: {
  label: string;
  note: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-line bg-slate-50 p-4">
      <div>
        <div className="text-sm font-semibold text-ink">{label}</div>
        <p className="mt-1 text-xs text-muted">{note}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
          checked ? "bg-clinical" : "bg-slate-300"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Globe2;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-slate-50 p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-clinical" />
        <span className="text-[10px] uppercase tracking-wide text-muted">{label}</span>
      </div>
      <div className="mt-2 text-sm font-semibold text-ink">{value}</div>
    </div>
  );
}

function PolicyCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-line bg-slate-50 p-4">
      <h4 className="text-sm font-semibold text-ink">{title}</h4>
      <p className="mt-2 text-xs leading-6 text-muted">{text}</p>
    </div>
  );
}
