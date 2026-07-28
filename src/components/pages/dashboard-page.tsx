"use client";

import Link from "next/link";
import {
  Activity, AlertOctagon, ArrowRight, BookOpen, Boxes, CheckCircle2, ChevronRight, CircleDot,
  Clock3, FileCheck2, FileStack, Play, Plus, ShieldCheck, Sparkles, UploadCloud
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge, Button, Card } from "@/components/ui/primitives";

const readiness = [
  {label:"Clinical Assets",value:92,color:"bg-clinical"},
  {label:"Extraction",value:74,color:"bg-violet"},
  {label:"Clinical Review",value:68,color:"bg-warning"},
  {label:"Safety Validation",value:86,color:"bg-success"},
  {label:"Runtime Compatibility",value:81,color:"bg-clinical"}
];
const sessions = [
  {name:"Session 01",approved:8,total:8,source:100,safety:100,status:"승인 완료",tone:"green" as const},
  {name:"Session 02",approved:11,total:12,source:92,safety:100,status:"검토 중",tone:"orange" as const},
  {name:"Session 03",approved:6,total:13,source:77,safety:62,status:"오류 2건",tone:"red" as const},
  {name:"Homework",approved:4,total:7,source:86,safety:100,status:"초안",tone:"gray" as const}
];
const queue = [
  {priority:"Critical",title:"위험 조건 에스컬레이션 연결",id:"STEP-07",reviewer:"박서준",source:"Session 03",time:"12분 전",tone:"red" as const},
  {priority:"High",title:"과제 수행 검토 질문 승인",id:"STEP-03",reviewer:"김지윤",source:"대화록 12:04",time:"34분 전",tone:"orange" as const},
  {priority:"Normal",title:"영문 안전 문구 번역 확인",id:"GLOBAL-RISK-01",reviewer:"Emily Han",source:"Safety Guide",time:"2시간 전",tone:"blue" as const}
];

export function DashboardPage() {
  return (
    <AppShell title="Overview" eyebrow="Protocol Operations" actions={<><Button variant="secondary"><FileCheck2 className="h-4 w-4"/>보고서 내보내기</Button><Link href="/projects/demo/protocols/tbct-br-001/validation"><Button><Play className="h-4 w-4"/>Validation 실행</Button></Link></>}>
      <div className="space-y-5 p-4 lg:p-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Metric icon={FileStack} label="등록 임상 자료" value="18" detail="+3 이번 주" tone="blue"/>
          <Metric icon={Boxes} label="구조화된 세션" value="6/12" detail="50% 완료" tone="violet"/>
          <Metric icon={Clock3} label="검토 대기 항목" value="14" detail="4건 우선 처리" tone="orange"/>
          <Metric icon={AlertOctagon} label="Critical Validation" value="2" detail="배포 차단" tone="red"/>
          <Metric icon={CircleDot} label="현재 버전" value="v0.3.0" detail="Draft" tone="gray" mono/>
          <Metric icon={CheckCircle2} label="Runtime Readiness" value="78%" detail="+6% 지난 주" tone="green"/>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.05fr_1.65fr]">
          <Card>
            <div className="flex items-center justify-between border-b border-line px-5 py-4"><div><h2 className="text-sm font-semibold">Protocol Readiness</h2><p className="mt-1 text-xs text-muted">발행을 위한 준비도</p></div><div className="relative flex h-16 w-16 items-center justify-center rounded-full" style={{background:"conic-gradient(#315FAD 78%, #E8EDF4 0)"}}><div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-sm font-bold text-navy">78%</div></div></div>
            <div className="space-y-4 p-5">{readiness.map((item)=><div key={item.label}><div className="mb-1.5 flex justify-between text-xs"><span className="font-medium">{item.label}</span><span className="font-semibold">{item.value}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.color}`} style={{width:`${item.value}%`}}/></div></div>)}</div>
            <div className="border-t border-line bg-slate-50/60 px-5 py-3 text-xs text-muted"><span className="font-semibold text-warning">다음 권장 작업:</span> Session 03 검증 오류 해결</div>
          </Card>

          <Card>
            <div className="flex items-center justify-between border-b border-line px-5 py-4"><div><h2 className="text-sm font-semibold">Protocol Coverage</h2><p className="mt-1 text-xs text-muted">세션별 구조화·출처·안전 규칙 커버리지</p></div><Button size="sm" variant="ghost">전체 세션 <ChevronRight className="h-3.5 w-3.5"/></Button></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-xs">
                <thead className="border-b border-line bg-slate-50 text-[10px] uppercase tracking-wider text-muted"><tr><th className="px-5 py-3">Session</th><th className="px-3 py-3">Approved Steps</th><th className="px-3 py-3">Source Links</th><th className="px-3 py-3">Safety Rules</th><th className="px-5 py-3 text-right">Status</th></tr></thead>
                <tbody className="divide-y divide-line">{sessions.map((s)=><tr key={s.name} className="hover:bg-slate-50/70"><td className="px-5 py-4 font-semibold">{s.name}</td><td className="px-3 py-4"><div className="flex items-center gap-2"><div className="h-1.5 w-20 overflow-hidden rounded bg-slate-100"><div className="h-full bg-clinical" style={{width:`${s.approved/s.total*100}%`}}/></div><span>{s.approved}/{s.total}</span></div></td><td className="px-3 py-4"><span className={s.source<80?"text-warning":"text-success"}>{s.source}%</span></td><td className="px-3 py-4"><span className={s.safety<80?"text-critical":"text-success"}>{s.safety}%</span></td><td className="px-5 py-4 text-right"><Badge tone={s.tone} dot>{s.status}</Badge></td></tr>)}</tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.45fr_.8fr]">
          <Card>
            <div className="flex items-center justify-between border-b border-line px-5 py-4"><div><h2 className="text-sm font-semibold">Review Queue</h2><p className="mt-1 text-xs text-muted">임상 검토가 필요한 항목 14개</p></div><Link href="/projects/demo/extraction"><Button size="sm" variant="secondary">검토 화면 열기</Button></Link></div>
            <div className="divide-y divide-line">{queue.map((item)=><Link href="/projects/demo/extraction" key={item.id} className="group flex items-center gap-4 px-5 py-4 hover:bg-slate-50"><span className={`h-8 w-1 rounded-full ${item.tone==="red"?"bg-critical":item.tone==="orange"?"bg-warning":"bg-clinical"}`}/><div className="min-w-0 flex-1"><div className="mb-1 flex items-center gap-2"><Badge tone={item.tone}>{item.priority}</Badge><span className="mono text-[10px] text-muted">{item.id}</span></div><p className="truncate text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs text-muted">{item.source} · 담당 {item.reviewer}</p></div><span className="whitespace-nowrap text-[11px] text-muted">{item.time}</span><ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-clinical"/></Link>)}</div>
          </Card>
          <Card>
            <div className="border-b border-line px-5 py-4"><h2 className="text-sm font-semibold">Quick Actions</h2><p className="mt-1 text-xs text-muted">주요 작업 바로 시작</p></div>
            <div className="grid grid-cols-2 gap-2 p-4">
              <QuickLink href="/projects/demo/assets" icon={UploadCloud} label="자료 업로드" tone="blue"/>
              <QuickLink href="/projects/demo/extraction" icon={Sparkles} label="구조화 초안" tone="violet"/>
              <QuickLink href="/projects/demo/protocols/tbct-br-001/canvas" icon={Boxes} label="Editor 열기" tone="blue"/>
              <QuickLink href="/projects/demo/protocols/tbct-br-001/validation" icon={ShieldCheck} label="검증 실행" tone="orange"/>
            </div>
          </Card>
        </div>

        <Card>
          <div className="flex items-center justify-between border-b border-line px-5 py-4"><div><h2 className="text-sm font-semibold">Recent Activity</h2><p className="mt-1 text-xs text-muted">프로토콜 변경 사항과 검토 기록</p></div><Link href="/audit" className="text-xs font-semibold text-clinical">Audit Log 보기 →</Link></div>
          <div className="grid divide-y divide-line md:grid-cols-4 md:divide-x md:divide-y-0">{[
            ["자료 등록","김지윤 님이 세션 03 대화록을 추가","8분 전",FileStack],
            ["질문 수정","STEP-03 기본 질문이 수정됨","34분 전",BookOpen],
            ["안전 규칙 승인","GLOBAL-RISK-01 승인 완료","1시간 전",ShieldCheck],
            ["버전 생성","v0.3.0 Draft가 생성됨","어제",Plus]
          ].map(([title,desc,time,Icon],i)=><div key={i} className="flex gap-3 p-5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-clinical"><Icon className="h-4 w-4"/></span><div><p className="text-xs font-semibold">{title as string}</p><p className="mt-1 text-xs leading-5 text-muted">{desc as string}</p><p className="mt-2 text-[10px] text-slate-400">{time as string}</p></div></div>)}</div>
        </Card>
      </div>
    </AppShell>
  );
}

function Metric({icon:Icon,label,value,detail,tone,mono}:{icon:typeof Activity;label:string;value:string;detail:string;tone:string;mono?:boolean}) {
  const color:Record<string,string>={blue:"bg-blue-50 text-clinical",violet:"bg-violet-50 text-violet",orange:"bg-orange-50 text-warning",red:"bg-red-50 text-critical",green:"bg-emerald-50 text-success",gray:"bg-slate-100 text-slate-600"};
  return <Card className="p-4"><div className="flex items-start justify-between"><span className={`flex h-8 w-8 items-center justify-center rounded-md ${color[tone]}`}><Icon className="h-4 w-4"/></span><ArrowRight className="h-3.5 w-3.5 text-slate-300"/></div><p className={`mt-4 text-2xl font-semibold tracking-tight ${mono?"mono text-xl":""}`}>{value}</p><p className="mt-1 text-xs font-medium">{label}</p><p className="mt-2 text-[10px] text-muted">{detail}</p></Card>;
}
function QuickLink({href,icon:Icon,label,tone}:{href:string;icon:typeof Activity;label:string;tone:string}) {
  return <Link href={href} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-line text-center transition hover:border-clinical hover:bg-blue-50/40"><Icon className={`h-5 w-5 ${tone==="violet"?"text-violet":tone==="orange"?"text-warning":"text-clinical"}`}/><span className="text-xs font-semibold">{label}</span></Link>;
}
