"use client";

import { usePathname } from "next/navigation";
import { DashboardPage } from "@/components/pages/dashboard-page";
import { AssetsPage } from "@/components/pages/assets-page";
import { ExtractionPage } from "@/components/pages/extraction-page";
import { ProtocolPage } from "@/components/pages/protocol-page";
import { SafetyPage } from "@/components/pages/safety-page";
import { ValidationPage } from "@/components/pages/validation-page";
import { VersionsPage } from "@/components/pages/versions-page";
import { AuditPage } from "@/components/pages/audit-page";
import { SettingsPage } from "@/components/pages/settings-page";

export function StudioApp() {
  const path = usePathname();
  if (path.includes("/assets")) return <AssetsPage/>;
  if (path.includes("/extraction")) return <ExtractionPage/>;
  if (path.includes("/canvas")) return <ProtocolPage/>;
  if (path.includes("/safety")) return <SafetyPage/>;
  if (path.includes("/validation")) return <ValidationPage/>;
  if (path.includes("/versions") || path.includes("/release")) return <VersionsPage/>;
  if (path.startsWith("/audit")) return <AuditPage/>;
  if (path.startsWith("/settings")) return <SettingsPage/>;
  return <DashboardPage/>;
}
