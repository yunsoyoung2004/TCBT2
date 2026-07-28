"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, Bell, BookOpenCheck, Boxes, CheckCircle2, ChevronDown, ClipboardCheck,
  Command, FileClock, FileStack, FlaskConical, Globe2, Menu, PanelLeftClose,
  Search, Settings, ShieldCheck, Sparkles, UploadCloud, X
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button, Modal, inputClass } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { useStudioStore } from "@/stores/studio-store";

const menu = [
  { label:"Overview", href:"/dashboard", icon:Activity },
  { label:"Clinical Assets", href:"/projects/demo/assets", icon:FileStack },
  { label:"Extraction Review", href:"/projects/demo/extraction", icon:Sparkles },
  { label:"Protocol Editor", href:"/projects/demo/protocols/tbct-br-001/canvas", icon:Boxes },
  { label:"Safety Rules", href:"/projects/demo/protocols/tbct-br-001/safety", icon:ShieldCheck },
  { label:"Validation", href:"/projects/demo/protocols/tbct-br-001/validation", icon:CheckCircle2 },
  { label:"Versions & Releases", href:"/projects/demo/protocols/tbct-br-001/versions", icon:FileClock },
  { label:"Audit Log", href:"/audit", icon:ClipboardCheck },
  { label:"Settings", href:"/settings", icon:Settings }
];

function getActive(pathname:string, href:string) {
  if (href === "/dashboard") return pathname === "/" || pathname === "/dashboard" || pathname === "/projects/demo";
  return pathname.startsWith(href);
}

export function AppShell({ children, title, eyebrow, actions }: {
  children:ReactNode; title:string; eyebrow:string; actions?:ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen,setMobileOpen] = useState(false);
  const [noticeOpen,setNoticeOpen] = useState(false);
  const commandOpen = useStudioStore((s)=>s.commandOpen);
  const setCommandOpen = useStudioStore((s)=>s.setCommandOpen);
  const unsaved = useStudioStore((s)=>s.unsaved);

  useEffect(() => {
    const onKey = (event:KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault(); setCommandOpen(true);
      }
    };
    window.addEventListener("keydown",onKey);
    return () => window.removeEventListener("keydown",onKey);
  },[setCommandOpen]);

  return (
    <div className="min-h-screen bg-canvas">
      <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-[#223b61] bg-navy text-white transition-transform lg:translate-x-0",mobileOpen?"translate-x-0":"-translate-x-full")}>
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-navy"><FlaskConical className="h-4 w-4"/></span>
            <span><span className="block text-[13px] font-bold tracking-wide">TBCT</span><span className="block text-[10px] text-blue-200">PROTOCOL STUDIO</span></span>
          </Link>
          <button className="lg:hidden" aria-label="메뉴 닫기" onClick={()=>setMobileOpen(false)}><X className="h-5 w-5"/></button>
        </div>
        <nav className="flex-1 space-y-1 overflow-auto px-3 py-4" aria-label="주 메뉴">
          {menu.map((item) => {
            const active = getActive(pathname,item.href);
            return (
              <Link key={item.href} href={item.href} onClick={()=>setMobileOpen(false)} className={cn("group flex h-10 items-center gap-3 rounded-md px-3 text-[13px] font-medium transition",active?"bg-white text-navy shadow-sm":"text-blue-100 hover:bg-white/10 hover:text-white")}>
                <item.icon className={cn("h-4 w-4",active?"text-clinical":"text-blue-200")} />
                <span className="flex-1">{item.label}</span>
                {item.label==="Validation" && <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">2</span>}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3">
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <div className="mb-2 flex items-center justify-between"><span className="text-[10px] uppercase tracking-wider text-blue-200">현재 프로젝트</span><span className="rounded bg-violet px-1.5 py-0.5 text-[9px] font-bold">DEMO</span></div>
            <p className="text-xs font-semibold">TBCT 우울 프로토콜</p>
            <div className="mt-2 flex items-center gap-2 text-[10px] text-blue-200"><Globe2 className="h-3 w-3"/> 대한민국 · 한국어</div>
            <div className="mt-1.5 flex items-center gap-2 text-[10px] text-blue-200"><BookOpenCheck className="h-3 w-3"/> 임상의 · 관리자</div>
          </div>
        </div>
      </aside>

      {mobileOpen && <button aria-label="메뉴 배경 닫기" className="fixed inset-0 z-40 bg-navy/30 lg:hidden" onClick={()=>setMobileOpen(false)}/>}

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white/95 px-4 backdrop-blur lg:px-6">
          <Button size="icon" variant="ghost" className="lg:hidden" onClick={()=>setMobileOpen(true)}><Menu className="h-5 w-5"/></Button>
          <div className="hidden min-w-0 items-center gap-2 text-xs text-muted sm:flex">
            <span>TBCT 우울 프로토콜</span><span>/</span><span className="truncate font-medium text-ink">{title}</span>
          </div>
          <button onClick={()=>setCommandOpen(true)} className="mx-auto flex h-9 w-full max-w-[430px] items-center gap-2 rounded-md border border-line bg-canvas px-3 text-xs text-muted transition hover:border-slate-300 hover:bg-white">
            <Search className="h-4 w-4"/><span className="flex-1 text-left">프로토콜, 자료, Step ID 검색</span><kbd className="rounded border border-line bg-white px-1.5 py-0.5 text-[10px]">⌘ K</kbd>
          </button>
          {unsaved && <span className="hidden items-center gap-1.5 text-[11px] text-warning xl:flex"><span className="h-1.5 w-1.5 rounded-full bg-warning"/>저장되지 않음</span>}
          <Button size="icon" variant="ghost" aria-label="알림" onClick={()=>setNoticeOpen(!noticeOpen)}><Bell className="h-4 w-4"/><span className="absolute mt-[-18px] ml-[16px] h-1.5 w-1.5 rounded-full bg-critical"/></Button>
          <button className="flex items-center gap-2 rounded-md p-1 hover:bg-slate-50"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-clinical">KJ</span><ChevronDown className="h-3.5 w-3.5 text-muted"/></button>
          {noticeOpen && <div className="absolute right-14 top-14 w-72 rounded-lg border border-line bg-white p-3 shadow-xl"><p className="text-xs font-semibold">새 알림 2개</p><div className="mt-2 space-y-2 text-xs text-muted"><p className="rounded bg-red-50 p-2 text-critical">검증에서 Critical 오류 2건이 발견되었습니다.</p><p className="rounded bg-blue-50 p-2 text-clinical">박서준 님이 안전 규칙을 승인했습니다.</p></div></div>}
        </header>
        <main>
          <div className="flex min-h-[76px] flex-col justify-between gap-3 border-b border-line bg-white px-4 py-4 sm:flex-row sm:items-center lg:px-6">
            <div><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-clinical">{eyebrow}</p><h1 className="mt-1 text-xl font-semibold tracking-tight text-ink">{title}</h1></div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          </div>
          {children}
        </main>
      </div>

      <Modal open={commandOpen} onClose={()=>setCommandOpen(false)} title="빠른 검색" description="페이지 이동, 자료 검색 또는 작업을 실행하세요." width="max-w-2xl">
        <div className="p-4">
          <div className="flex items-center gap-2 rounded-lg border border-clinical bg-blue-50/40 px-3"><Search className="h-4 w-4 text-clinical"/><input autoFocus className={cn(inputClass,"border-0 bg-transparent px-0 focus:ring-0")} placeholder="예: STEP-03, 검증, 자료 업로드"/></div>
          <p className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-wider text-muted">페이지</p>
          <div className="grid gap-1 sm:grid-cols-2">{menu.slice(0,8).map((item)=><Link onClick={()=>setCommandOpen(false)} key={item.href} href={item.href} className="flex items-center gap-3 rounded-md p-3 text-sm hover:bg-slate-50"><item.icon className="h-4 w-4 text-clinical"/>{item.label}</Link>)}</div>
          <div className="mt-3 border-t border-line pt-3"><button className="flex w-full items-center gap-3 rounded-md p-3 text-sm hover:bg-slate-50"><UploadCloud className="h-4 w-4 text-violet"/>새 임상 자료 업로드 <span className="ml-auto text-[10px] text-muted">Action</span></button></div>
        </div>
      </Modal>
    </div>
  );
}
