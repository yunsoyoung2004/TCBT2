"use client";

import { useParams, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PatientShell } from "@/components/runtime/patient-shell";
import { Card, EmptyState, PageSkeleton } from "@/components/ui/primitives";
import { getRuntimeSession } from "@/lib/api/runtime-session-api";
import { ensureHomeworkForSession } from "@/lib/api/homework-api";
import { HOMEWORK_LABEL_BY_SESSION, hasHomeworkActivity } from "@/types/homework";
import { useT } from "@/lib/i18n/context";
import { WeeklyExamplesHomework } from "@/components/pages/homework/s01-weekly-examples";
import { CheckInHomework } from "@/components/pages/homework/s02-checkin";
import { ReviewIntraTrHomework } from "@/components/pages/homework/s03-review-intra-tr";
import { ActionPlanHomework } from "@/components/pages/homework/s04-action-plan";
import { ReviewGridHomework } from "@/components/pages/homework/s05-review-grid";
import { PracticeHomework } from "@/components/pages/homework/s06-practice";
import { DecisionPlanHomework } from "@/components/pages/homework/s07-decision-plan";
import { AppealRecordHomework } from "@/components/pages/homework/s08-appeal-record";
import type { RuntimeSessionView } from "@/types/runtime-session";
import type { HomeworkRecord } from "@/types/homework";

// One shared entry route (/patient/homework/{sessionId}) that loads the
// session + ensures the homework record, then hands off to the
// session-specific component -- each of the eight owns its own layout,
// fields, and interaction rules; nothing here is shared beyond "which one
// to render" and the loading/not-found states.
export function HomeworkPage() {
  const { t } = useT();
  const params = useParams<{ sessionId: string }>();
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const sessionId = (Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId) ?? segments.at(-1) ?? "";

  const sessionQuery = useQuery({ queryKey: ["runtime-session-for-homework", sessionId], queryFn: () => getRuntimeSession(sessionId), enabled: Boolean(sessionId) });
  const session = sessionQuery.data?.session;
  const homeworkQuery = useQuery({
    queryKey: ["homework-record", sessionId],
    queryFn: () => (session ? ensureHomeworkForSession(session) : Promise.resolve(undefined)),
    enabled: Boolean(session),
    refetchInterval: 4000,
  });

  if (sessionQuery.isLoading || homeworkQuery.isLoading) return <PatientShell title={t("homework.loading")}><PageSkeleton /></PatientShell>;
  if (!session || !hasHomeworkActivity(session.sessionDefinitionId) || !homeworkQuery.data) {
    return <PatientShell title={t("homework.loading")}><Card><EmptyState title={t("homework.notAvailable")} /></Card></PatientShell>;
  }

  return <HomeworkSessionView sessionView={sessionQuery.data!} homework={homeworkQuery.data} label={HOMEWORK_LABEL_BY_SESSION[session.sessionDefinitionId]} />;
}

function HomeworkSessionView({ sessionView, homework, label }: { sessionView: RuntimeSessionView; homework: HomeworkRecord; label: string }) {
  const { session } = sessionView;
  switch (session.sessionDefinitionId) {
    case "tbct-s01": return <WeeklyExamplesHomework session={session} homework={homework} label={label} />;
    case "tbct-s02": return <CheckInHomework session={session} homework={homework} label={label} />;
    case "tbct-s03": return <ReviewIntraTrHomework session={session} homework={homework} label={label} />;
    case "tbct-s04": return <ActionPlanHomework session={session} homework={homework} label={label} />;
    case "tbct-s05": return <ReviewGridHomework session={session} homework={homework} label={label} />;
    case "tbct-s06": return <PracticeHomework session={session} homework={homework} label={label} />;
    case "tbct-s07": return <DecisionPlanHomework session={session} homework={homework} label={label} />;
    case "tbct-s08": return <AppealRecordHomework session={session} homework={homework} label={label} />;
    default: return null;
  }
}
