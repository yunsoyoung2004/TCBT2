import type {
  AuditEntry, ClinicalAsset, ProtocolEdge, ProtocolStep, ProtocolVersion,
  SafetyRule, TranscriptSegment, ValidationIssue
} from "@/types";

export const assets: ClinicalAsset[] = [
  { id:"AST-001", title:"TBCT 세션 03 치료자 대화록", type:"TBCT 세션 녹취", language:"한국어", country:"대한민국", version:"v1.2", session:"Session 03", extractionStatus:"review", reviewStatus:"review", author:"김지윤", updatedAt:"12분 전", blocks:24 },
  { id:"AST-002", title:"세션별 치료 매뉴얼 — 행동활성화", type:"세션별 치료 매뉴얼", language:"한국어", country:"대한민국", version:"v2.1", session:"Session 02", extractionStatus:"approved", reviewStatus:"approved", author:"박서준", updatedAt:"어제", blocks:38 },
  { id:"AST-003", title:"TBCT Clinician Prompt Library", type:"기존 Claude 프롬프트", language:"English", country:"Global", version:"v0.8", session:"공통", extractionStatus:"approved", reviewStatus:"review", author:"Emily Han", updatedAt:"7월 25일", blocks:16 },
  { id:"AST-004", title:"환자용 과제 수행 안내서", type:"환자용 매뉴얼", language:"한국어", country:"대한민국", version:"v1.0", session:"Homework", extractionStatus:"draft", reviewStatus:"draft", author:"이하늘", updatedAt:"7월 23일", blocks:0 },
  { id:"AST-005", title:"AI 상담 보조 안전 가이드", type:"AI 감독관 매뉴얼", language:"한국어", country:"대한민국", version:"v1.4", session:"Global Safety", extractionStatus:"approved", reviewStatus:"approved", author:"정민수", updatedAt:"7월 21일", blocks:31 },
  { id:"AST-006", title:"TBCT Session 01 Orientation", type:"TBCT 세션 녹취", language:"English", country:"United States", version:"v0.9", session:"Session 01", extractionStatus:"error", reviewStatus:"draft", author:"Julia Park", updatedAt:"7월 19일", blocks:11 }
];

export const transcript: TranscriptSegment[] = [
  { id:"SEG-031", speaker:"치료자", timestamp:"12:04–12:18", text:"지난주에 계획했던 행동들은 어느 정도 수행하셨어요?", highlighted:true },
  { id:"SEG-032", speaker:"환자", timestamp:"12:19–12:35", text:"세 번 정도였는데, 혼자 외출하는 건 어려웠어요.", highlighted:true },
  { id:"SEG-033", speaker:"치료자", timestamp:"12:36–13:02", text:"완료한 세 번은 중요한 변화예요. 외출할 때 무엇이 가장 큰 장벽이었는지 함께 살펴볼까요?" },
  { id:"SEG-034", speaker:"환자", timestamp:"13:03–13:24", text:"나가기 전부터 실패할 것 같다는 생각이 계속 들었어요." },
  { id:"SEG-035", speaker:"치료자", timestamp:"13:25–14:01", text:"그 생각이 들 때 계획을 더 작은 단계로 나누는 방법을 시도해 볼 수 있어요." }
];

export const protocolSteps: ProtocolStep[] = [
  { id:"START-01", type:"Session Start", title:"세션 시작 및 상태 확인", required:true, status:"approved", intent:"안전하게 세션을 시작하고 현재 상태를 확인한다.", prompt:"오늘 세션을 시작하기 전에 현재 기분을 알려주세요.", guide:"차분하고 중립적인 표현을 사용합니다.", branchCount:1, sourceCount:2, position:{x:40,y:190} },
  { id:"STEP-01", type:"Orientation", title:"지난 세션 요약", required:true, status:"approved", intent:"직전 세션의 핵심 내용과 과제를 상기한다.", prompt:"지난 시간에 함께 정한 계획을 기억하시나요?", guide:"환자의 기억을 평가하지 말고 단서를 제공합니다.", branchCount:1, sourceCount:3, position:{x:310,y:70} },
  { id:"STEP-03", type:"Assessment", title:"과제 수행 검토", required:true, status:"review", intent:"이전 세션에서 설정한 행동의 수행 여부와 장애요인을 확인한다.", prompt:"지난주에 계획했던 행동 중 실제로 수행한 행동이 있었나요?", guide:"완료 여부보다 시도와 경험을 구체화합니다.", branchCount:3, sourceCount:4, position:{x:310,y:300} },
  { id:"STEP-04", type:"Condition", title:"수행 수준 분기", required:true, status:"approved", intent:"과제 수행 수준에 맞는 다음 단계를 결정한다.", prompt:"수행 결과를 선택하세요.", guide:"완료·일부 완료·미완료 세 경로를 사용합니다.", branchCount:3, sourceCount:1, position:{x:610,y:180} },
  { id:"STEP-05", type:"Activity", title:"성공 경험 강화", required:false, status:"draft", intent:"완료한 행동의 긍정적 효과를 강화한다.", prompt:"실행했을 때 달라진 점은 무엇이었나요?", guide:"구체적인 변화와 감각에 초점을 둡니다.", branchCount:1, sourceCount:2, position:{x:900,y:40} },
  { id:"STEP-06", type:"Dialogue", title:"장애요인 탐색", required:true, status:"review", intent:"일부 수행의 장애요인과 가능한 대안을 찾는다.", prompt:"계획대로 하기 어려웠던 순간을 떠올려볼까요?", guide:"비판 없이 환경과 생각을 함께 탐색합니다.", branchCount:1, sourceCount:2, position:{x:900,y:220} },
  { id:"STEP-07", type:"Safety Check", title:"위험 신호 확인", required:true, status:"error", intent:"위험 표현을 감지하고 안전 경로로 전환한다.", prompt:"최근 자신을 해치고 싶다는 생각이 든 적이 있나요?", guide:"직접적이고 모호하지 않게 질문합니다.", branchCount:2, sourceCount:3, position:{x:900,y:410} }
];

export const protocolEdges: ProtocolEdge[] = [
  {id:"e1",source:"START-01",target:"STEP-01"},
  {id:"e2",source:"START-01",target:"STEP-03"},
  {id:"e3",source:"STEP-01",target:"STEP-04"},
  {id:"e4",source:"STEP-03",target:"STEP-04"},
  {id:"e5",source:"STEP-04",target:"STEP-05",label:"완료"},
  {id:"e6",source:"STEP-04",target:"STEP-06",label:"일부 완료"},
  {id:"e7",source:"STEP-04",target:"STEP-07",label:"미완료"}
];

export const safetyRules: SafetyRule[] = [
  { id:"GLOBAL-RISK-01", title:"자살 또는 자해 위험", trigger:"직접적 자해 의도, 구체적 계획, 최근 시도, 간접적 위험 표현", action:"일반 TBCT 흐름 정지 → 안전 확인 질문 → 승인된 안전 응답", escalation:"High", active:true, status:"approved", sessions:["전체 세션"], updatedAt:"오늘 09:42" },
  { id:"GLOBAL-RISK-02", title:"급성 정신병적 증상", trigger:"현실 검증력 저하 또는 명령 환청 보고", action:"자동 중단 후 담당 임상의 검토 요청", escalation:"High", active:true, status:"review", sessions:["전체 세션"], updatedAt:"어제 16:20" },
  { id:"SESSION-02-MOOD", title:"급격한 기분 저하", trigger:"기분 점수 2점 이하가 2회 연속 보고됨", action:"추가 평가 질문 및 임상의 알림", escalation:"Medium", active:true, status:"approved", sessions:["Session 02","Session 03"], updatedAt:"7월 25일" },
  { id:"GLOBAL-MED-01", title:"약물 변경 보고", trigger:"약물 중단 또는 용량 임의 변경", action:"의학적 조언 금지 안내 및 담당자 연결", escalation:"Medium", active:false, status:"draft", sessions:["전체 세션"], updatedAt:"7월 22일" }
];

export const validationIssues: ValidationIssue[] = [
  { id:"VAL-001", severity:"critical", category:"안전 규칙", location:"SESSION-03 / STEP-07", title:"위험 조건에 Clinician Escalation 단계가 없습니다", description:"고위험 응답 이후의 모든 분기는 승인된 임상의 에스컬레이션 단계로 연결되어야 합니다.", stepId:"STEP-07" },
  { id:"VAL-002", severity:"critical", category:"구조 검증", location:"SESSION-03 / STEP-09", title:"도달할 수 없는 필수 단계", description:"STEP-09로 들어오는 edge가 없어 런타임에서 실행될 수 없습니다.", stepId:"STEP-09" },
  { id:"VAL-003", severity:"warning", category:"출처 추적성", location:"SESSION-02 / STEP-04", title:"표현 가이드의 근거 문단 누락", description:"임상의가 수정한 표현 가이드에 원문 source reference가 없습니다.", stepId:"STEP-04" },
  { id:"VAL-004", severity:"warning", category:"런타임 호환성", location:"SESSION-01 / STEP-02", title:"지원되지 않는 action type", description:"runtime schema v1.8에서 adaptive_pause는 지원되지 않습니다.", stepId:"STEP-02" },
  { id:"VAL-005", severity:"info", category:"번역 일치", location:"GLOBAL-RISK-01", title:"영문 번역 검토 권장", description:"한국어 원문이 수정된 후 영문 번역이 아직 검토되지 않았습니다." }
];

export const versions: ProtocolVersion[] = [
  { id:"VER-030", version:"v0.3.0", status:"Draft", author:"김지윤", date:"2026.07.28 10:32", nodes:64, changes:{added:7,modified:12,removed:2,edges:5} },
  { id:"VER-021", version:"v0.2.1", status:"Clinical Review", author:"박서준", date:"2026.07.24 15:18", nodes:59, changes:{added:3,modified:8,removed:0,edges:3} },
  { id:"VER-020", version:"v0.2.0", status:"Published", author:"Emily Han", date:"2026.07.18 09:40", nodes:56, changes:{added:12,modified:18,removed:3,edges:9} },
  { id:"VER-010", version:"v0.1.0", status:"Archived", author:"김지윤", date:"2026.07.02 11:05", nodes:47, changes:{added:47,modified:0,removed:0,edges:45} }
];

export const auditEntries: AuditEntry[] = [
  {id:"AUD-481",timestamp:"2026.07.28 10:42:16",user:"김지윤",initials:"KJ",action:"질문 수정",resource:"STEP-03",previousValue:"지난주 과제를 수행했나요?",newValue:"지난주에 계획했던 행동 중 실제로 수행한 행동이 있었나요?",reason:"평가적 표현 완화",version:"v0.3.0"},
  {id:"AUD-480",timestamp:"2026.07.28 09:42:03",user:"박서준",initials:"PS",action:"안전 규칙 승인",resource:"GLOBAL-RISK-01",previousValue:"Clinical Review",newValue:"Approved",reason:"위기대응팀 검토 완료",version:"v0.3.0"},
  {id:"AUD-479",timestamp:"2026.07.27 17:26:50",user:"AI Extractor",initials:"AI",action:"구조화 초안 생성",resource:"AST-001",previousValue:"—",newValue:"24 extraction blocks",reason:"자동 추출 완료",version:"v0.3.0"},
  {id:"AUD-478",timestamp:"2026.07.27 16:10:22",user:"Emily Han",initials:"EH",action:"출처 연결",resource:"STEP-06",previousValue:"1 source",newValue:"2 sources",reason:"대화록 근거 보강",version:"v0.3.0"},
  {id:"AUD-477",timestamp:"2026.07.26 14:03:09",user:"정민수",initials:"JM",action:"검증 실행",resource:"TBCT-BR-001",previousValue:"84%",newValue:"86%",reason:"수동 검증",version:"v0.3.0"}
];
