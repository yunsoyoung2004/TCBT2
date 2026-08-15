"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, LoaderCircle, Inbox, TriangleAlert, CircleHelp, PanelRightOpen } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { drawerPanel, modalBackdrop, modalPanel } from "@/lib/motion/motion-variants";
import { useReducedMotionPreference } from "@/lib/motion/use-reduced-motion-preference";
import { cn, reviewStatusMap, severityMap, versionStatusMap } from "@/lib/utils";

type Tone = "neutral" | "primary" | "violet" | "success" | "warning" | "critical";

const toneClass: Record<Tone, string> = {
  neutral: "border-border bg-surface-subtle text-text-secondary",
  primary: "border-clinical-blue-light bg-clinical-blue-light text-clinical-blue",
  violet: "border-ai-violet-light bg-ai-violet-light text-ai-violet",
  success: "border-success-light bg-success-light text-success",
  warning: "border-warning-light bg-warning-light text-warning",
  critical: "border-critical-light bg-critical-light text-critical",
};

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  loading,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration"> & {
  // Omitted event names above are the standard motion.button/native-button
  // type conflict (framer-motion's onDrag et al. use a different event
  // signature than the plain DOM one) -- none of this app's Button call
  // sites pass any of them, so this only narrows an unused corner of the
  // type, not real behavior.
  variant?: "primary" | "secondary" | "ghost" | "danger" | "violet";
  size?: "sm" | "md" | "icon";
  loading?: boolean;
}) {
  const styles = {
    primary: "border-clinical-blue bg-clinical-blue text-white hover:bg-[#2f5b9f]",
    secondary: "border-border bg-surface text-text-primary hover:bg-surface-hover",
    ghost: "border-transparent bg-transparent text-text-secondary hover:bg-surface-hover",
    danger: "border-critical bg-critical text-white hover:bg-[#ac3340]",
    violet: "border-ai-violet bg-ai-violet text-white hover:bg-[#674cbc]",
  };
  const sizes = { sm: "h-8 px-3 text-xs", md: "h-9 px-3.5 text-sm", icon: "h-9 w-9" };
  const reducedMotion = useReducedMotionPreference();
  return (
    <motion.button
      // A satisfying little "press" on every button in the app, from one
      // shared component -- whileTap only ever plays while the button is
      // actually held down (auto-reverses on release, no separate cleanup
      // needed), so it can't get stuck mid-animation like a manual
      // active-class toggle could.
      whileTap={reducedMotion || loading || props.disabled ? undefined : { scale: 0.96 }}
      transition={{ duration: 0.1 }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-panel border font-medium transition disabled:pointer-events-none disabled:opacity-50",
        styles[variant],
        sizes[size],
        className,
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
      {children}
    </motion.button>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-panel border border-border bg-surface", className)}>{children}</section>;
}

export function Badge({
  children,
  tone = "neutral",
  dot = false,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-semibold",
        toneClass[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const mapped = reviewStatusMap[status as keyof typeof reviewStatusMap] ?? versionStatusMap[status] ?? {
    label: status,
    tone: "neutral",
  };
  return <Badge tone={mapped.tone as Tone} dot>{mapped.label}</Badge>;
}

export function ValidationSeverityBadge({ severity }: { severity: keyof typeof severityMap }) {
  const mapped = severityMap[severity];
  return <Badge tone={mapped.tone as Tone} dot>{mapped.label}</Badge>;
}

export function ProtocolVersionBadge({ version }: { version: string }) {
  return <span className="mono inline-flex rounded-md border border-border bg-surface-subtle px-2 py-1 text-[11px] font-semibold text-text-secondary">{version}</span>;
}

export function SaveStatus({ state }: { state: "idle" | "saving" | "saved" | "error" }) {
  const map = {
    idle: { label: "No changes", tone: "neutral" as Tone },
    saving: { label: "Saving", tone: "warning" as Tone },
    saved: { label: "Saved", tone: "success" as Tone },
    error: { label: "Save failed", tone: "critical" as Tone },
  };
  const current = map[state];
  return <Badge tone={current.tone} dot>{current.label}</Badge>;
}

export function SourceReferenceChip({ label, onClick, title }: { label: string; onClick?: () => void; title?: string }) {
  if (onClick) {
    return (
      <button
        type="button"
        title={title}
        onClick={onClick}
        className="inline-flex items-center rounded-md border border-border bg-surface-subtle px-2 py-1 text-[11px] text-text-secondary hover:bg-surface-hover"
      >
        {label}
      </button>
    );
  }
  return <span title={title} className="inline-flex items-center rounded-md border border-border bg-surface-subtle px-2 py-1 text-[11px] text-text-secondary">{label}</span>;
}

export function MetricCard({
  label,
  value,
  helper,
  accent = "primary",
  action,
}: {
  label: string;
  value: string;
  helper: string;
  accent?: Tone;
  action?: ReactNode;
}) {
  return (
    <Card className="flex min-h-[132px] flex-col justify-between p-4">
      <div className="flex items-start justify-between gap-3">
        <Badge tone={accent}>{label}</Badge>
        {action}
      </div>
      <div>
        <div className="mt-6 text-[28px] font-semibold tracking-tight text-text-primary">{value}</div>
        <div className="mt-2 text-xs text-text-secondary">{helper}</div>
      </div>
    </Card>
  );
}

export function PageHeader({
  title,
  description,
  eyebrow,
  meta,
  actions,
}: {
  title: string;
  description: string;
  eyebrow?: string;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  // Mobile (<640px) gets a denser title/spacing tier so more of the page's
  // actual content is visible without scrolling; every value below has a
  // "sm:" twin equal to today's unconditional value, so >=640px (tablet and
  // desktop) resolves to the exact same classes as before this change.
  return (
    <div className="flex flex-col gap-3 border-b border-border bg-surface px-4 py-3 sm:gap-4 sm:py-5 lg:px-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          {eyebrow && <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-clinical-blue">{eyebrow}</div>}
          <h1 className="mt-1 text-lg font-semibold tracking-tight text-text-primary sm:mt-2 sm:text-[26px]">{title}</h1>
          {/* Descriptive copy is nice-to-have on a full page, but on mobile
              it's pure vertical cost competing with the actual content/tabs
              below it (brief §16) -- still shown unchanged at >=640px. */}
          <p className="mt-1 hidden text-[13px] text-text-secondary sm:block">{description}</p>
          {meta && <div className="mt-2 flex flex-wrap items-center gap-2 sm:mt-3">{meta}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3">
      <div>
        <h2 className="text-[16px] font-semibold text-text-primary">{title}</h2>
        {description && <p className="mt-1 text-xs text-text-secondary">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return <Card className={cn("p-3", className)}><div className="flex flex-col gap-3 xl:flex-row xl:items-center">{children}</div></Card>;
}

export function EmptyState({
  title = "No data available",
  description = "Adjust the filter or add more records.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
      <Inbox className="mb-3 h-8 w-8 text-text-muted" />
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      <p className="mt-1 max-w-md text-xs text-text-secondary">{description}</p>
    </div>
  );
}

export function ErrorState({ retry }: { retry?: () => void }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
      <TriangleAlert className="mb-3 h-8 w-8 text-critical" />
      <p className="text-sm font-semibold text-text-primary">Failed to load data.</p>
      <p className="mt-1 text-xs text-text-secondary">Retry or inspect the current local runtime state.</p>
      {retry && (
        <Button className="mt-4" variant="secondary" onClick={retry}>
          Retry
        </Button>
      )}
    </div>
  );
}

export function LoadingSkeleton() {
  return (
    <div className="space-y-5 p-6">
      <div className="skeleton h-8 w-64 rounded-panel" />
      <div className="grid gap-4 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => <div key={item} className="skeleton h-28 rounded-panel" />)}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.25fr_.95fr]">
        <div className="skeleton h-[420px] rounded-panel" />
        <div className="skeleton h-[420px] rounded-panel" />
      </div>
    </div>
  );
}

export function ReviewStatus({ label, helper }: { label: string; helper: string }) {
  return (
    <div className="rounded-panel border border-border bg-surface-subtle p-3">
      <div className="text-xs font-semibold text-text-primary">{label}</div>
      <div className="mt-1 text-[11px] text-text-secondary">{helper}</div>
    </div>
  );
}

export function ConfirmActionDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  confirmDisabled = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmDisabled?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      <div className="flex justify-end gap-2 p-5">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="danger" disabled={confirmDisabled} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  width = "max-w-xl",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  width?: string;
}) {
  const reducedMotion = useReducedMotionPreference();
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#132A4A]/28 p-4"
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
          variants={reducedMotion ? undefined : modalBackdrop}
          initial={reducedMotion ? false : "initial"}
          animate={reducedMotion ? undefined : "animate"}
          exit={reducedMotion ? undefined : "exit"}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn("max-h-[92vh] w-full overflow-hidden rounded-[12px] border border-border bg-surface", width)}
            variants={reducedMotion ? undefined : modalPanel}
            initial={reducedMotion ? false : "initial"}
            animate={reducedMotion ? undefined : "animate"}
            exit={reducedMotion ? undefined : "exit"}
          >
            <div className="flex items-start justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-text-primary">{title}</h2>
                {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
              </div>
              <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[calc(92vh-78px)] overflow-auto">{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function DetailDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  width = "w-[640px]",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  width?: string;
}) {
  const reducedMotion = useReducedMotionPreference();
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[75] bg-[#132A4A]/18"
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
          variants={reducedMotion ? undefined : modalBackdrop}
          initial={reducedMotion ? false : "initial"}
          animate={reducedMotion ? undefined : "animate"}
          exit={reducedMotion ? undefined : "exit"}
        >
          <motion.aside
            className={cn("absolute bottom-0 right-0 top-0 max-w-[96vw] border-l border-border bg-surface", width)}
            variants={reducedMotion ? undefined : drawerPanel}
            initial={reducedMotion ? false : "initial"}
            animate={reducedMotion ? undefined : "animate"}
            exit={reducedMotion ? undefined : "exit"}
          >
            <div className="flex h-[72px] items-center justify-between border-b border-border px-5">
              <div>
                <h2 className="text-base font-semibold text-text-primary">{title}</h2>
                {subtitle && <p className="mt-1 text-xs text-text-secondary">{subtitle}</p>}
              </div>
              <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
                <PanelRightOpen className="h-4 w-4" />
              </Button>
            </div>
            <div className="h-[calc(100%-72px)] overflow-auto p-5">{children}</div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-text-primary">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-text-secondary">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "h-9 w-full rounded-panel border border-border bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-clinical-blue focus:outline-none focus:ring-2 focus:ring-clinical-blue-light";
export const textareaClass =
  "min-h-24 w-full resize-y rounded-panel border border-border bg-surface px-3 py-2 text-sm leading-6 text-text-primary placeholder:text-text-muted focus:border-clinical-blue focus:outline-none focus:ring-2 focus:ring-clinical-blue-light";

export function PageSkeleton() {
  return <LoadingSkeleton />;
}

export function IconLabel({ icon, label }: { icon: ReactNode; label: string }) {
  return <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">{icon}{label}</span>;
}

export function HintCallout({ text }: { text: string }) {
  return (
    <div className="rounded-panel border border-border bg-surface-subtle px-3 py-2 text-xs text-text-secondary">
      <div className="inline-flex items-center gap-2">
        <CircleHelp className="h-3.5 w-3.5 text-clinical-blue" />
        <span>{text}</span>
      </div>
    </div>
  );
}
