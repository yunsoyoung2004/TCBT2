"use client";

import { X, LoaderCircle, Inbox, TriangleAlert } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Button({
  children, className, variant = "primary", size = "md", loading, ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "violet";
  size?: "sm" | "md" | "icon";
  loading?: boolean;
}) {
  const styles = {
    primary:"bg-navy text-white hover:bg-[#1d3b69] border-navy",
    secondary:"bg-white text-ink hover:bg-slate-50 border-line",
    ghost:"bg-transparent text-muted hover:bg-slate-100 border-transparent",
    danger:"bg-critical text-white hover:bg-red-700 border-critical",
    violet:"bg-violet text-white hover:bg-[#6246b6] border-violet"
  };
  const sizes = { sm:"h-8 px-3 text-xs", md:"h-9 px-3.5 text-sm", icon:"h-9 w-9" };
  return (
    <button
      className={cn("inline-flex items-center justify-center gap-2 rounded-md border font-medium transition disabled:pointer-events-none disabled:opacity-50",styles[variant],sizes[size],className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-lg border border-line bg-white shadow-panel",className)}>{children}</section>;
}

const badgeTone = {
  gray:"border-slate-200 bg-slate-50 text-slate-600",
  blue:"border-blue-200 bg-blue-50 text-clinical",
  violet:"border-violet-200 bg-violet-50 text-violet",
  green:"border-emerald-200 bg-emerald-50 text-success",
  orange:"border-orange-200 bg-orange-50 text-warning",
  red:"border-red-200 bg-red-50 text-critical"
};

export function Badge({ children, tone = "gray", dot = false, className }: {
  children:ReactNode; tone?:keyof typeof badgeTone; dot?:boolean; className?:string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded border px-2 py-0.5 text-[11px] font-semibold",badgeTone[tone],className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status:string }) {
  const map: Record<string,{label:string;tone:keyof typeof badgeTone}> = {
    draft:{label:"초안",tone:"gray"}, review:{label:"검토 필요",tone:"orange"},
    approved:{label:"승인됨",tone:"blue"}, error:{label:"검증 오류",tone:"red"},
    published:{label:"발행됨",tone:"green"}, Draft:{label:"초안",tone:"gray"},
    "Clinical Review":{label:"임상 검토",tone:"orange"}, Published:{label:"발행됨",tone:"green"},
    Archived:{label:"보관됨",tone:"gray"}
  };
  const value = map[status] ?? {label:status,tone:"gray" as const};
  return <Badge tone={value.tone} dot>{value.label}</Badge>;
}

export function Modal({ open, onClose, title, description, children, width = "max-w-xl" }: {
  open:boolean; onClose:()=>void; title:string; description?:string; children:ReactNode; width?:string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/35 p-4 backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" className={cn("max-h-[90vh] w-full overflow-hidden rounded-xl border border-line bg-white shadow-2xl",width)}>
        <div className="flex items-start justify-between border-b border-line px-5 py-4">
          <div><h2 className="text-base font-semibold">{title}</h2>{description && <p className="mt-1 text-sm text-muted">{description}</p>}</div>
          <Button variant="ghost" size="icon" aria-label="닫기" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="max-h-[calc(90vh-76px)] overflow-auto">{children}</div>
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, children, width = "w-[460px]" }: {
  open:boolean; onClose:()=>void; title:string; children:ReactNode; width?:string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[75] bg-navy/20" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className={cn("absolute bottom-0 right-0 top-0 max-w-[92vw] border-l border-line bg-white shadow-2xl",width)}>
        <div className="flex h-16 items-center justify-between border-b border-line px-5">
          <h2 className="font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" aria-label="닫기" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="h-[calc(100%-64px)] overflow-auto p-5">{children}</div>
      </aside>
    </div>
  );
}

export function Field({ label, children, hint }: { label:string; children:ReactNode; hint?:string }) {
  return (
    <label className="block text-xs font-semibold text-slate-700">
      <span className="mb-1.5 block">{label}</span>{children}
      {hint && <span className="mt-1 block text-[11px] font-normal text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass = "h-9 w-full rounded-md border border-line bg-white px-3 text-sm text-ink placeholder:text-slate-400 focus:border-clinical focus:outline-none focus:ring-2 focus:ring-blue-100";
export const textareaClass = "min-h-20 w-full resize-y rounded-md border border-line bg-white px-3 py-2 text-sm leading-6 text-ink placeholder:text-slate-400 focus:border-clinical focus:outline-none focus:ring-2 focus:ring-blue-100";

export function PageSkeleton() {
  return (
    <div className="space-y-5 p-6">
      <div className="skeleton h-8 w-56 rounded" />
      <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i=><div key={i} className="skeleton h-28 rounded-lg" />)}</div>
      <div className="grid grid-cols-3 gap-4"><div className="skeleton col-span-2 h-96 rounded-lg" /><div className="skeleton h-96 rounded-lg" /></div>
    </div>
  );
}

export function EmptyState({ title = "표시할 데이터가 없습니다", description = "필터를 조정하거나 새 항목을 추가해 주세요." }: {title?:string;description?:string}) {
  return <div className="flex min-h-56 flex-col items-center justify-center p-8 text-center"><Inbox className="mb-3 h-8 w-8 text-slate-300"/><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-muted">{description}</p></div>;
}

export function ErrorState({ retry }: {retry?:()=>void}) {
  return <div className="flex min-h-56 flex-col items-center justify-center p-8 text-center"><TriangleAlert className="mb-3 h-8 w-8 text-critical"/><p className="text-sm font-semibold">데이터를 불러오지 못했습니다</p><p className="mt-1 text-xs text-muted">잠시 후 다시 시도해 주세요.</p>{retry&&<Button className="mt-4" variant="secondary" onClick={retry}>다시 시도</Button>}</div>;
}
