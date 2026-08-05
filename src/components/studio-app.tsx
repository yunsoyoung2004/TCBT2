"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

const DashboardPage = dynamic(() => import("@/components/pages/dashboard-page").then((mod) => mod.DashboardPage), { ssr: false });
const AssetsPage = dynamic(() => import("@/components/pages/assets-page").then((mod) => mod.AssetsPage), { ssr: false });
const ClinicalAssetRegistrationPage = dynamic(() => import("@/components/pages/clinical-asset-registration-page").then((mod) => mod.ClinicalAssetRegistrationPage), { ssr: false });
const ExtractionPage = dynamic(() => import("@/components/pages/extraction-page").then((mod) => mod.ExtractionPage), { ssr: false });
const ProtocolPage = dynamic(() => import("@/components/pages/protocol-page").then((mod) => mod.ProtocolPage), { ssr: false });
const SafetyPage = dynamic(() => import("@/components/pages/safety-page").then((mod) => mod.SafetyPage), { ssr: false });
const ValidationPage = dynamic(() => import("@/components/pages/validation-page").then((mod) => mod.ValidationPage), { ssr: false });
const VersionsPage = dynamic(() => import("@/components/pages/versions-page").then((mod) => mod.VersionsPage), { ssr: false });
const AuditPage = dynamic(() => import("@/components/pages/audit-page").then((mod) => mod.AuditPage), { ssr: false });
const SettingsPage = dynamic(() => import("@/components/pages/settings-page").then((mod) => mod.SettingsPage), { ssr: false });
const PatientListPage = dynamic(() => import("@/components/pages/patient-list-page").then((mod) => mod.PatientListPage), { ssr: false });
const PatientNewSessionPage = dynamic(() => import("@/components/pages/patient-new-session-page").then((mod) => mod.PatientNewSessionPage), { ssr: false });
const PatientSessionPage = dynamic(() => import("@/components/pages/patient-session-page").then((mod) => mod.PatientSessionPage), { ssr: false });
const PatientSessionCompletePage = dynamic(() => import("@/components/pages/patient-session-complete-page").then((mod) => mod.PatientSessionCompletePage), { ssr: false });
const PatientProfilePage = dynamic(() => import("@/components/pages/patient-profile-page").then((mod) => mod.PatientProfilePage), { ssr: false });
const PatientMemoryPage = dynamic(() => import("@/components/pages/patient-memory-page").then((mod) => mod.PatientMemoryPage), { ssr: false });
const PatientAuditConversationPage = dynamic(() => import("@/components/pages/patient-audit-conversation-page").then((mod) => mod.PatientAuditConversationPage), { ssr: false });
const RuntimeInspectorPage = dynamic(() => import("@/components/pages/runtime-inspector-page").then((mod) => mod.RuntimeInspectorPage), { ssr: false });
const RuntimeEscalationsPage = dynamic(() => import("@/components/pages/runtime-escalations-page").then((mod) => mod.RuntimeEscalationsPage), { ssr: false });
const RuntimeParticipantPage = dynamic(() => import("@/components/pages/runtime-participant-page").then((mod) => mod.RuntimeParticipantPage), { ssr: false });
const RuntimeMemoryReviewPage = dynamic(() => import("@/components/pages/runtime-memory-review-page").then((mod) => mod.RuntimeMemoryReviewPage), { ssr: false });
const RuntimeSessionSummaryPage = dynamic(() => import("@/components/pages/runtime-session-summary-page").then((mod) => mod.RuntimeSessionSummaryPage), { ssr: false });
const RuntimeSafetyDashboardPage = dynamic(() => import("@/components/pages/runtime-safety-dashboard-page").then((mod) => mod.RuntimeSafetyDashboardPage), { ssr: false });
const RuntimeSafetyEventsPage = dynamic(() => import("@/components/pages/runtime-safety-events-page").then((mod) => mod.RuntimeSafetyEventsPage), { ssr: false });
const RuntimeSafetyEventDetailPage = dynamic(() => import("@/components/pages/runtime-safety-event-detail-page").then((mod) => mod.RuntimeSafetyEventDetailPage), { ssr: false });
const RuntimeSafetyMyQueuePage = dynamic(() => import("@/components/pages/runtime-safety-my-queue-page").then((mod) => mod.RuntimeSafetyMyQueuePage), { ssr: false });
const RuntimeSafetyFollowUpsPage = dynamic(() => import("@/components/pages/runtime-safety-followups-page").then((mod) => mod.RuntimeSafetyFollowUpsPage), { ssr: false });
const RuntimeSafetyNotificationsPage = dynamic(() => import("@/components/pages/runtime-safety-notifications-page").then((mod) => mod.RuntimeSafetyNotificationsPage), { ssr: false });
const RuntimeSafetyAnalyticsPage = dynamic(() => import("@/components/pages/runtime-safety-analytics-page").then((mod) => mod.RuntimeSafetyAnalyticsPage), { ssr: false });
const RuntimeSafetyReportDetailPage = dynamic(() => import("@/components/pages/runtime-safety-report-detail-page").then((mod) => mod.RuntimeSafetyReportDetailPage), { ssr: false });
const RuntimePilotDashboardPage = dynamic(() => import("@/components/pages/runtime-pilot-dashboard-page").then((mod) => mod.RuntimePilotDashboardPage), { ssr: false });
const RuntimePilotConfigurationPage = dynamic(() => import("@/components/pages/runtime-pilot-configuration-page").then((mod) => mod.RuntimePilotConfigurationPage), { ssr: false });
const RuntimePilotSitesPage = dynamic(() => import("@/components/pages/runtime-pilot-sites-page").then((mod) => mod.RuntimePilotSitesPage), { ssr: false });
const RuntimePilotParticipantsPage = dynamic(() => import("@/components/pages/runtime-pilot-participants-page").then((mod) => mod.RuntimePilotParticipantsPage), { ssr: false });
const RuntimePilotParticipantDetailPage = dynamic(() => import("@/components/pages/runtime-pilot-participant-detail-page").then((mod) => mod.RuntimePilotParticipantDetailPage), { ssr: false });
const RuntimePilotScreeningPage = dynamic(() => import("@/components/pages/runtime-pilot-screening-page").then((mod) => mod.RuntimePilotScreeningPage), { ssr: false });
const RuntimePilotEnrollmentPage = dynamic(() => import("@/components/pages/runtime-pilot-enrollment-page").then((mod) => mod.RuntimePilotEnrollmentPage), { ssr: false });
const RuntimePilotAllocationPage = dynamic(() => import("@/components/pages/runtime-pilot-allocation-page").then((mod) => mod.RuntimePilotAllocationPage), { ssr: false });
const RuntimePilotSessionsPage = dynamic(() => import("@/components/pages/runtime-pilot-sessions-page").then((mod) => mod.RuntimePilotSessionsPage), { ssr: false });
const RuntimePilotDeviationsPage = dynamic(() => import("@/components/pages/runtime-pilot-deviations-page").then((mod) => mod.RuntimePilotDeviationsPage), { ssr: false });
const RuntimePilotOutcomesPage = dynamic(() => import("@/components/pages/runtime-pilot-outcomes-page").then((mod) => mod.RuntimePilotOutcomesPage), { ssr: false });
const RuntimePilotDataQualityPage = dynamic(() => import("@/components/pages/runtime-pilot-data-quality-page").then((mod) => mod.RuntimePilotDataQualityPage), { ssr: false });
const RuntimePilotExportsPage = dynamic(() => import("@/components/pages/runtime-pilot-exports-page").then((mod) => mod.RuntimePilotExportsPage), { ssr: false });
const RuntimePilotReportsPage = dynamic(() => import("@/components/pages/runtime-pilot-reports-page").then((mod) => mod.RuntimePilotReportsPage), { ssr: false });
const RuntimePilotReportDetailPage = dynamic(() => import("@/components/pages/runtime-pilot-report-detail-page").then((mod) => mod.RuntimePilotReportDetailPage), { ssr: false });

type StudioRoute = {
  matches: (pathname: string) => boolean;
  Page: ComponentType;
};

const studioRoutes: StudioRoute[] = [
  { matches: (pathname) => pathname.includes("/patient/audits/"), Page: PatientAuditConversationPage },
  { matches: (pathname) => pathname.includes("/patient/profile"), Page: PatientProfilePage },
  { matches: (pathname) => pathname.includes("/patient/memory"), Page: PatientMemoryPage },
  { matches: (pathname) => pathname.includes("/patient/sessions/new"), Page: PatientNewSessionPage },
  { matches: (pathname) => pathname.includes("/patient/sessions/") && pathname.endsWith("/complete"), Page: PatientSessionCompletePage },
  { matches: (pathname) => pathname.includes("/patient/sessions/"), Page: PatientSessionPage },
  { matches: (pathname) => pathname.includes("/patient"), Page: PatientListPage },
  { matches: (pathname) => pathname.includes("/runtime/pilot/participants/"), Page: RuntimePilotParticipantDetailPage },
  { matches: (pathname) => pathname.includes("/runtime/pilot/reports/"), Page: RuntimePilotReportDetailPage },
  { matches: (pathname) => pathname.includes("/runtime/pilot/configuration"), Page: RuntimePilotConfigurationPage },
  { matches: (pathname) => pathname.includes("/runtime/pilot/sites"), Page: RuntimePilotSitesPage },
  { matches: (pathname) => pathname.includes("/runtime/pilot/participants"), Page: RuntimePilotParticipantsPage },
  { matches: (pathname) => pathname.includes("/runtime/pilot/screening"), Page: RuntimePilotScreeningPage },
  { matches: (pathname) => pathname.includes("/runtime/pilot/enrollment"), Page: RuntimePilotEnrollmentPage },
  { matches: (pathname) => pathname.includes("/runtime/pilot/allocation"), Page: RuntimePilotAllocationPage },
  { matches: (pathname) => pathname.includes("/runtime/pilot/sessions"), Page: RuntimePilotSessionsPage },
  { matches: (pathname) => pathname.includes("/runtime/pilot/deviations"), Page: RuntimePilotDeviationsPage },
  { matches: (pathname) => pathname.includes("/runtime/pilot/outcomes"), Page: RuntimePilotOutcomesPage },
  { matches: (pathname) => pathname.includes("/runtime/pilot/data-quality"), Page: RuntimePilotDataQualityPage },
  { matches: (pathname) => pathname.includes("/runtime/pilot/exports"), Page: RuntimePilotExportsPage },
  { matches: (pathname) => pathname.includes("/runtime/pilot/reports"), Page: RuntimePilotReportsPage },
  { matches: (pathname) => pathname.includes("/runtime/pilot"), Page: RuntimePilotDashboardPage },
  { matches: (pathname) => pathname.includes("/runtime/safety/events/"), Page: RuntimeSafetyEventDetailPage },
  { matches: (pathname) => pathname.includes("/runtime/safety/reports/"), Page: RuntimeSafetyReportDetailPage },
  { matches: (pathname) => pathname.includes("/runtime/safety/events"), Page: RuntimeSafetyEventsPage },
  { matches: (pathname) => pathname.includes("/runtime/safety/my-queue"), Page: RuntimeSafetyMyQueuePage },
  { matches: (pathname) => pathname.includes("/runtime/safety/follow-ups"), Page: RuntimeSafetyFollowUpsPage },
  { matches: (pathname) => pathname.includes("/runtime/safety/notifications"), Page: RuntimeSafetyNotificationsPage },
  { matches: (pathname) => pathname.includes("/runtime/safety/analytics"), Page: RuntimeSafetyAnalyticsPage },
  { matches: (pathname) => pathname.includes("/runtime/safety"), Page: RuntimeSafetyDashboardPage },
  { matches: (pathname) => pathname.includes("/runtime/memory-review"), Page: RuntimeMemoryReviewPage },
  { matches: (pathname) => pathname.includes("/runtime/participants/"), Page: RuntimeParticipantPage },
  { matches: (pathname) => pathname.includes("/runtime/sessions/") && pathname.endsWith("/summary"), Page: RuntimeSessionSummaryPage },
  { matches: (pathname) => pathname.includes("/runtime/escalations"), Page: RuntimeEscalationsPage },
  { matches: (pathname) => pathname.includes("/runtime/sessions/"), Page: RuntimeInspectorPage },
  { matches: (pathname) => pathname.includes("/clinical-assets/new"), Page: ClinicalAssetRegistrationPage },
  { matches: (pathname) => pathname.includes("/assets"), Page: AssetsPage },
  { matches: (pathname) => pathname.includes("/extraction"), Page: ExtractionPage },
  { matches: (pathname) => pathname.includes("/canvas"), Page: ProtocolPage },
  { matches: (pathname) => pathname.includes("/safety"), Page: SafetyPage },
  { matches: (pathname) => pathname.includes("/validation"), Page: ValidationPage },
  { matches: (pathname) => pathname.includes("/versions") || pathname.includes("/release"), Page: VersionsPage },
  { matches: (pathname) => pathname.startsWith("/audit"), Page: AuditPage },
  { matches: (pathname) => pathname.startsWith("/settings"), Page: SettingsPage },
];

export function StudioApp() {
  const pathname = usePathname();
  const route = studioRoutes.find(({ matches }) => matches(pathname));
  const Page = route?.Page ?? DashboardPage;

  return <Page />;
}
