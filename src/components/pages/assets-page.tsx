"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock, Check, ChevronDown, Download, FileAudio2, FileText, Filter,
  Grid2X2, Languages, List, MoreHorizontal, Plus, Search, SlidersHorizontal,
  UploadCloud
} from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/layout/app-shell";
import {
  Badge, Button, Card, Drawer, EmptyState, ErrorState, Field, inputClass, Modal,
  PageSkeleton, StatusBadge, textareaClass
} from "@/components/ui/primitives";
import { getAssets, uploadAsset } from "@/lib/api/mock-api";
import { cn } from "@/lib/utils";
import { useStudioStore } from "@/stores/studio-store";
import type { ClinicalAsset } from "@/types";

const formSchema = z.object({
  title:z.string().min(2,"자료 제목을 입력해 주세요."),
  type:z.string().min(1),
  author:z.string().min(2),
  country:z.string().min(1),
  language:z.string().min(1),
  session:z.string().min(1),
  version:z.string().min(1),
  note:z.string().optional()
});
type UploadForm = z.infer<typeof formSchema>;

export function AssetsPage() {
  const queryClient = useQueryClient();
  const {data,isLoading,isError,refetch} = useQuery({queryKey:["assets"],queryFn:getAssets});
  const [query,setQuery]=useState("");
  const [type,setType]=useState("전체 유형");
  const [uploadOpen,setUploadOpen]=useState(false);
  const [selected,setSelected]=useState<ClinicalAsset|null>(null);
  const [fileName,setFileName]=useState("");
  const [progress,setProgress]=useState(0);
  const assetView=useStudioStore((s)=>s.assetView);
  const setAssetView=useStudioStore((s)=>s.setAssetView);

  const form=useForm<UploadForm>({resolver:zodResolver(formSchema),defaultValues:{title:"",type:"TBCT 세션 녹취",author:"김지윤",country:"대한민국",language:"한국어",session:"Session 03",version:"v1.0",note:""}});
  const mutation=useMutation({
    mutationFn:async(values:UploadForm)=>{
      setProgress(12); const timer=setInterval(()=>setProgress(p=>Math.min(p+13,91)),100);
      try { return await uploadAsset(values); } finally { clearInterval(timer);setProgress(100); }
    },
    onSuccess:(item)=>{
      queryClient.setQueryData<ClinicalAsset[]>(["assets"],old=>[item,...(old??[])]);
      toast.success("임상 자료가 등록되었습니다",{description:"구조화 초안을 생성할 준비가 되었습니다."});
      setTimeout(()=>{setUploadOpen(false);setProgress(0);setFileName("");form.reset();},450);
    },
    onError:()=>toast.error("업로드에 실패했습니다")
  });
  const filtered=useMemo(()=>data?.filter((item)=>(type==="전체 유형"||item.type===type)&&(item.title.toLowerCase().includes(query.toLowerCase())||item.id.toLowerCase().includes(query.toLowerCase())))??[],[data,query,type]);

  if(isLoading) return <AppShell title="Clinical Assets" eyebrow="Source Library"><PageSkeleton/></AppShell>;
  return (
    <AppShell title="Clinical Assets" eyebrow="Source Library" actions={<><Button variant="secondary"><Download className="h-4 w-4"/>목록 내보내기</Button><Button onClick={()=>setUploadOpen(true)}><Plus className="h-4 w-4"/>임상 자료 등록</Button></>}>
      <div className="space-y-4 p-4 lg:p-6">
        <Card className="p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-56 flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><input value={query} onChange={e=>setQuery(e.target.value)} className={cn(inputClass,"pl-9")} placeholder="자료 제목, ID, 담당자 검색"/></div>
            <FilterSelect value={type} onChange={setType} options={["전체 유형","TBCT 세션 녹취","세션별 치료 매뉴얼","기존 Claude 프롬프트","환자용 매뉴얼","AI 감독관 매뉴얼"]}/>
            <FilterSelect value="전체 언어" options={["전체 언어","한국어","English"]}/>
            <FilterSelect value="전체 세션" options={["전체 세션","Session 01","Session 02","Session 03","Homework"]}/>
            <Button variant="secondary"><SlidersHorizontal className="h-4 w-4"/>고급 필터</Button>
            <div className="flex rounded-md border border-line p-0.5"><Button aria-label="그리드 보기" variant={assetView==="grid"?"primary":"ghost"} size="icon" className="h-8 w-8" onClick={()=>setAssetView("grid")}><Grid2X2 className="h-4 w-4"/></Button><Button aria-label="테이블 보기" variant={assetView==="table"?"primary":"ghost"} size="icon" className="h-8 w-8" onClick={()=>setAssetView("table")}><List className="h-4 w-4"/></Button></div>
          </div>
        </Card>

        <div className="flex items-center justify-between text-xs text-muted"><span>전체 <strong className="text-ink">{filtered.length}</strong>개 자료</span><button className="flex items-center gap-1 font-medium">최근 수정순 <ChevronDown className="h-3.5 w-3.5"/></button></div>
        {isError ? <Card><ErrorState retry={()=>refetch()}/></Card> : filtered.length===0 ? <Card><EmptyState title="조건에 맞는 자료가 없습니다"/></Card> : assetView==="grid" ?
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map(item=><AssetCard key={item.id} item={item} onClick={()=>setSelected(item)}/>)}</div> :
          <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="border-b border-line bg-slate-50 text-[10px] uppercase tracking-wider text-muted"><tr><th className="px-5 py-3">자료</th><th className="px-3 py-3">유형 / 세션</th><th className="px-3 py-3">언어 / 국가</th><th className="px-3 py-3">추출 상태</th><th className="px-3 py-3">검토 상태</th><th className="px-3 py-3">담당자</th><th className="px-5 py-3">수정일</th></tr></thead><tbody className="divide-y divide-line">{filtered.map(item=><tr key={item.id} className="cursor-pointer hover:bg-slate-50" onClick={()=>setSelected(item)}><td className="px-5 py-4"><p className="font-semibold">{item.title}</p><p className="mono mt-1 text-[10px] text-muted">{item.id} · {item.version}</p></td><td className="px-3 py-4"><p>{item.type}</p><p className="mt-1 text-muted">{item.session}</p></td><td className="px-3 py-4">{item.language} · {item.country}</td><td className="px-3 py-4"><StatusBadge status={item.extractionStatus}/></td><td className="px-3 py-4"><StatusBadge status={item.reviewStatus}/></td><td className="px-3 py-4">{item.author}</td><td className="px-5 py-4 text-muted">{item.updatedAt}</td></tr>)}</tbody></table></div></Card>
        }
      </div>

      <Modal open={uploadOpen} onClose={()=>!mutation.isPending&&setUploadOpen(false)} title="임상 자료 등록" description="원문 자료와 임상 메타데이터를 함께 등록합니다." width="max-w-3xl">
        <form onSubmit={form.handleSubmit(v=>mutation.mutate(v))}>
          <div className="space-y-5 p-5">
            <div onClick={()=>setFileName("tbct_session03_transcript.pdf")} className={cn("flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition",fileName?"border-success bg-emerald-50/50":"border-slate-300 hover:border-clinical hover:bg-blue-50/40")}>
              {fileName?<><span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-success"><Check className="h-5 w-5"/></span><p className="text-sm font-semibold">{fileName}</p><p className="mt-1 text-xs text-muted">2.4 MB · PDF · 파일 준비됨</p></>:<><UploadCloud className="mb-3 h-8 w-8 text-clinical"/><p className="text-sm font-semibold">파일을 끌어 놓거나 클릭하여 선택</p><p className="mt-1 text-xs text-muted">PDF, DOCX, TXT, MP3 · 최대 50MB</p></>}
            </div>
            {mutation.isPending&&<div><div className="mb-1 flex justify-between text-xs"><span>보안 업로드 및 메타데이터 처리 중</span><strong>{progress}%</strong></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-clinical transition-all" style={{width:`${progress}%`}}/></div></div>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="자료 제목"><input {...form.register("title")} className={inputClass} placeholder="예: TBCT 세션 03 치료자 대화록"/>{form.formState.errors.title&&<span className="mt-1 block text-[11px] text-critical">{form.formState.errors.title.message}</span>}</Field>
              <Field label="자료 유형"><select {...form.register("type")} className={inputClass}><option>TBCT 세션 녹취</option><option>세션별 치료 매뉴얼</option><option>기존 Claude 프롬프트</option><option>환자용 매뉴얼</option><option>AI 감독관 매뉴얼</option></select></Field>
              <Field label="저작자"><input {...form.register("author")} className={inputClass}/></Field>
              <Field label="연결 세션"><select {...form.register("session")} className={inputClass}><option>Session 01</option><option>Session 02</option><option>Session 03</option><option>Homework</option><option>Global Safety</option></select></Field>
              <Field label="국가"><select {...form.register("country")} className={inputClass}><option>대한민국</option><option>United States</option><option>Global</option></select></Field>
              <Field label="원문 언어"><select {...form.register("language")} className={inputClass}><option>한국어</option><option>English</option></select></Field>
              <Field label="버전"><input {...form.register("version")} className={inputClass}/></Field>
              <Field label="내용 권한"><select className={inputClass}><option>프로젝트 멤버</option><option>임상의만</option><option>관리자만</option></select></Field>
            </div>
            <Field label="비고"><textarea {...form.register("note")} className={textareaClass} placeholder="자료의 사용 범위나 원본·번역 관계를 기록하세요."/></Field>
          </div>
          <div className="flex justify-end gap-2 border-t border-line bg-slate-50 px-5 py-4"><Button type="button" variant="secondary" onClick={()=>setUploadOpen(false)}>취소</Button><Button type="submit" loading={mutation.isPending} disabled={!fileName}>자료 등록</Button></div>
        </form>
      </Modal>

      <Drawer open={!!selected} onClose={()=>setSelected(null)} title="자료 상세" width="w-[500px]">{selected&&<AssetDetail item={selected}/>}</Drawer>
    </AppShell>
  );
}

function FilterSelect({value,options,onChange}:{value:string;options:string[];onChange?:(value:string)=>void}) {
  return <select value={value} onChange={e=>onChange?.(e.target.value)} className={cn(inputClass,"w-auto min-w-32")}><option>{value}</option>{options.filter(o=>o!==value).map(o=><option key={o}>{o}</option>)}</select>;
}
function AssetCard({item,onClick}:{item:ClinicalAsset;onClick:()=>void}) {
  const audio=item.type.includes("녹취");
  return <Card className="group cursor-pointer overflow-hidden transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md" ><button onClick={onClick} className="w-full p-5 text-left"><div className="flex items-start justify-between"><span className={cn("flex h-10 w-10 items-center justify-center rounded-lg",audio?"bg-violet-50 text-violet":"bg-blue-50 text-clinical")}>{audio?<FileAudio2 className="h-5 w-5"/>:<FileText className="h-5 w-5"/>}</span><MoreHorizontal className="h-4 w-4 text-slate-400"/></div><p className="mt-4 truncate text-sm font-semibold">{item.title}</p><p className="mono mt-1 text-[10px] text-muted">{item.id} · {item.version}</p><div className="mt-4 flex flex-wrap gap-1.5"><Badge>{item.type}</Badge><Badge tone="blue">{item.session}</Badge></div><div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4"><div><p className="text-[10px] text-muted">추출 상태</p><div className="mt-1.5"><StatusBadge status={item.extractionStatus}/></div></div><div><p className="text-[10px] text-muted">검토 상태</p><div className="mt-1.5"><StatusBadge status={item.reviewStatus}/></div></div></div><div className="mt-4 flex items-center justify-between text-[10px] text-muted"><span>{item.author}</span><span>{item.updatedAt}</span></div></button></Card>;
}
function AssetDetail({item}:{item:ClinicalAsset}) {
  return <div className="space-y-6"><div className="flex items-start gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-clinical"><FileText className="h-5 w-5"/></span><div><h3 className="text-sm font-semibold">{item.title}</h3><p className="mono mt-1 text-[10px] text-muted">{item.id} · {item.version}</p></div></div><div className="grid grid-cols-2 gap-4 rounded-lg border border-line bg-slate-50 p-4 text-xs">{[["유형",item.type],["연결 세션",item.session],["언어 / 국가",`${item.language} / ${item.country}`],["저작자",item.author],["추출 블록",`${item.blocks}개`],["최근 수정",item.updatedAt]].map(([k,v])=><div key={k}><p className="text-[10px] text-muted">{k}</p><p className="mt-1 font-medium">{v}</p></div>)}</div><section><h4 className="text-xs font-semibold">연결된 프로토콜 단계</h4><div className="mt-2 space-y-2">{["STEP-03 과제 수행 검토","STEP-06 장애요인 탐색","STEP-07 위험 신호 확인"].map(x=><div key={x} className="flex items-center gap-2 rounded border border-line p-3 text-xs"><span className="h-2 w-2 rounded-full bg-clinical"/>{x}</div>)}</div></section><section><h4 className="text-xs font-semibold">변경 이력</h4><div className="mt-2 space-y-3 border-l border-line pl-4 text-xs text-muted"><p><strong className="text-ink">김지윤</strong> 님이 검토 상태를 변경 · 12분 전</p><p><strong className="text-ink">AI Extractor</strong>가 24개 블록 추출 · 어제</p><p><strong className="text-ink">김지윤</strong> 님이 자료 등록 · 어제</p></div></section><Button className="w-full" variant="secondary"><FileText className="h-4 w-4"/>원본 보기</Button></div>;
}
