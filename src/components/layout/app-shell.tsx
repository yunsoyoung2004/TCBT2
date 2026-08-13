"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Boxes,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  FileStack,
  FlaskConical,
  Globe,
  HelpCircle,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button, Modal, inputClass } from "@/components/ui/primitives";
import { getCurrentDemoActor } from "@/lib/demo-actor";
import { useAuth } from "@/lib/auth/auth-context";
import { useT } from "@/lib/i18n/context";
import type { UiLocale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";
import { useStudioStore } from "@/stores/studio-store";

type Audience = "clinician" | "internal" | "admin";

interface NavItem {
  labelKey: string;
  href: string;
  icon: typeof Boxes;
  audience: Audience;
}

const NAV_ITEMS: NavItem[] = [
  // Clinician-facing primary navigation — keep to exactly these two.
  { labelKey: "nav.protocolEditor", href: "/projects/demo/protocols/tbct-br-001/canvas", icon: Boxes, audience: "clinician" },
  { labelKey: "nav.patientMonitoring", href: "/patients", icon: Users, audience: "clinician" },
  // Admin-only -- filtered by the real logged-in user's auth role
  // (see visibleNavItems below), independent of the legacy
  // isClinicianAudience/showFullNav toggle above, which is about the old
  // demo-actor picker, not real Supabase Auth roles.
  { labelKey: "nav.adminUsers", href: "/admin/users", icon: ShieldCheck, audience: "admin" },
  { labelKey: "nav.adminDeletionRequests", href: "/admin/deletion-requests", icon: ClipboardCheck, audience: "admin" },
  // Reuses the existing /audit page as-is (Protocol Studio content-change
  // history) -- just makes it discoverable for admin specifically, on top
  // of the direct-URL access clinicians already have via its default
  // "clinician" audience below.
  { labelKey: "nav.auditLog", href: "/audit", icon: ClipboardCheck, audience: "admin" },
  // Internal/engineering routes: still implemented and reachable by direct URL,
  // just hidden from the standard clinician sidebar and command palette.
  // The old "Overview" dashboard was removed entirely (studio-app.tsx now
  // falls back to the Protocol Editor for any unmatched path, including the
  // old "/dashboard" URL) rather than kept as a hidden internal route --
  // unlike the routes below, it had no unique content worth preserving
  // behind a direct link once its own page component was deleted.
  { labelKey: "Clinical Assets", href: "/projects/demo/assets", icon: FileStack, audience: "internal" },
  { labelKey: "Extraction Review", href: "/projects/demo/extraction", icon: Sparkles, audience: "internal" },
  { labelKey: "Safety Rules", href: "/projects/demo/protocols/tbct-br-001/safety", icon: ShieldCheck, audience: "internal" },
  { labelKey: "Validation", href: "/projects/demo/protocols/tbct-br-001/validation", icon: CheckCircle2, audience: "internal" },
  { labelKey: "Audit Log (internal)", href: "/audit", icon: ClipboardCheck, audience: "internal" },
  { labelKey: "Settings", href: "/settings", icon: Settings, audience: "internal" },
];

// The standard clinician workspace always shows only the reduced navigation,
// regardless of which demo actor is active — there is no role-based toggle
// back to the full internal menu. Internal/engineering routes stay in the
// codebase and reachable by direct URL, they are just never listed here.
function isClinicianAudience(_role: string) {
  return true;
}

function isActive(pathname: string, href: string) {
  return pathname.startsWith(href);
}

function buildBreadcrumb(pathname: string) {
  const tokens = pathname.split("/").filter(Boolean);
  if (!tokens.length) return ["Protocol Editor"];
  return tokens
    .map((token) => token.replaceAll("-", " "))
    .map((token) => token.replace(/\b\w/g, (char) => char.toUpperCase()));
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const commandOpen = useStudioStore((state) => state.commandOpen);
  const setCommandOpen = useStudioStore((state) => state.setCommandOpen);
  const unsaved = useStudioStore((state) => state.unsaved);
  const activeActorRole = useStudioStore((state) => state.activeActorRole);
  const setActiveActor = useStudioStore((state) => state.setActiveActor);
  const { locale, setLocale, t } = useT();
  const { user, role, signOut } = useAuth();
  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };
  const identityInitials = (user?.email ?? "??").slice(0, 2).toUpperCase();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setCommandOpen]);

  useEffect(() => {
    const actor = getCurrentDemoActor();
    setActiveActor(actor.id);
  }, [setActiveActor]);

  const breadcrumbs = useMemo(() => buildBreadcrumb(pathname), [pathname]);
  const sidebarWidth = collapsed ? "lg:pl-[92px]" : "lg:pl-[248px]";
  const showFullNav = !isClinicianAudience(activeActorRole);
  const visibleNavItems = useMemo(
    () =>
      NAV_ITEMS.filter((item) => {
        if (item.audience === "admin") return role === "admin";
        return showFullNav || item.audience === "clinician";
      }),
    [showFullNav, role],
  );
  const navLabel = (item: NavItem) => (item.labelKey.startsWith("nav.") ? t(item.labelKey) : item.labelKey);
  const clinicianNavItems = useMemo(() => NAV_ITEMS.filter((item) => item.audience === "clinician"), []);

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex border-r border-[#20436f] bg-navy-900 text-white transition-all duration-200 lg:translate-x-0",
          collapsed ? "w-[92px]" : "w-[248px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex w-full flex-col">
          <div className="flex h-[68px] items-center justify-between gap-2 border-b border-white/10 px-4">
            <Link href="/projects/demo/protocols/tbct-br-001/canvas" className="flex min-w-0 flex-1 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-panel bg-white text-navy-900">
                <FlaskConical className="h-5 w-5" />
              </span>
              {!collapsed && (
                <span className="min-w-0 overflow-hidden whitespace-nowrap">
                  <span className="block truncate whitespace-nowrap text-sm font-semibold">TBCT Studio</span>
                  <span className="block text-[11px] text-blue-100">Medical Research × AI Engineering</span>
                </span>
              )}
            </Link>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/10 hover:text-white lg:inline-flex"
                onClick={() => setCollapsed((value) => !value)}
              >
                {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/10 hover:text-white lg:hidden"
                onClick={() => setMobileOpen(false)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!collapsed && (
            <div className="border-b border-white/10 px-4 py-4">
              <div className="rounded-panel border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-blue-100">Project</div>
                  <span className="rounded-md border border-[#6d90c4] bg-[#214473] px-2 py-1 text-[10px] font-semibold text-blue-100">Demo Mode</span>
                </div>
                <div className="mt-3 text-sm font-semibold">TBCT-BR-001</div>
                <div className="mt-1 text-xs text-blue-100">Korea · Korean · Pilot readiness</div>
              </div>
            </div>
          )}

          <nav className="flex-1 overflow-auto px-3 py-4">
            <div className="space-y-1">
              {visibleNavItems.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "group relative flex h-10 items-center gap-3 rounded-panel px-3 text-sm transition",
                      active ? "bg-clinical-blue-light text-clinical-blue" : "text-blue-100 hover:bg-white/8 hover:text-white",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    {active && <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r bg-clinical-blue" />}
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{navLabel(item)}</span>}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-white/10 p-3 space-y-3">
            {!collapsed ? (
              <div className="flex items-center gap-2 rounded-panel border border-white/10 bg-white/5 p-1">
                <Globe className="ml-2 h-3.5 w-3.5 text-blue-100" aria-hidden />
                {(["ko", "en"] as UiLocale[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-label={`${t("nav.language")}: ${option.toUpperCase()}`}
                    onClick={() => setLocale(option)}
                    className={cn(
                      "flex-1 rounded-md px-2 py-1 text-xs font-semibold transition",
                      locale === option ? "bg-white text-navy-900" : "text-blue-100 hover:bg-white/10",
                    )}
                  >
                    {option.toUpperCase()}
                  </button>
                ))}
              </div>
            ) : (
              <button
                type="button"
                aria-label={t("nav.language")}
                onClick={() => setLocale(locale === "ko" ? "en" : "ko")}
                className="flex h-9 w-full items-center justify-center rounded-panel border border-white/10 bg-white/5 text-blue-100 hover:bg-white/10"
              >
                <Globe className="h-4 w-4" />
              </button>
            )}
            {!collapsed && (
              <Link href="/account" className="block px-1 text-xs text-blue-100 hover:underline">
                {t("nav.account")}
              </Link>
            )}
            <button
              type="button"
              onClick={() => void handleLogout()}
              className={cn("w-full rounded-panel border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10", collapsed && "p-2")}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-clinical-blue-light text-sm font-semibold text-clinical-blue">{identityInitials}</span>
                {!collapsed && (
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{user?.email ?? "—"}</div>
                    <div className="text-xs text-blue-100">{t("auth.logout")}</div>
                  </div>
                )}
              </div>
            </button>
          </div>
        </div>
      </aside>

      {mobileOpen && <button className="fixed inset-0 z-40 bg-[#132A4A]/24 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu" />}

      <div className={cn("transition-all", sidebarWidth)}>
        <header className="sticky top-0 z-30 flex h-[56px] items-center gap-3 border-b border-border bg-surface/96 px-4 backdrop-blur lg:px-5">
          {/* Mobile (<640px) drops the hamburger entirely -- bottom nav is the
              top-level mobile navigation (see the "sm:hidden" nav below).
              Tablet (640-1024px) keeps today's drawer trigger unchanged, and
              it's already hidden >=1024px (fixed sidebar) same as before. */}
          <Button size="icon" variant="ghost" className="hidden sm:inline-flex lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-4 w-4" />
          </Button>
          <div className="hidden w-[132px] shrink-0 items-center text-xs text-text-secondary 2xl:flex">
            {breadcrumbs.map((item, index) => (
              <div key={`${item}-${index}`} className={cn("items-center gap-2", index === breadcrumbs.length - 1 ? "flex" : "hidden")}>
                <span className={cn("truncate", index === breadcrumbs.length - 1 && "font-semibold text-text-primary")}>{item}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setCommandOpen(true)}
            className="mx-auto flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-panel border border-border bg-surface-subtle px-3 text-sm text-text-secondary hover:bg-surface md:max-w-[560px] [&>span:last-child]:hidden"
          >
            <Search className="h-4 w-4" />
            {/* Same search entry point/scope at every width -- only the label
                text is shorter below 640px so it doesn't clip. */}
            <span className="flex-1 truncate text-left">
              <span className="sm:hidden">Search…</span>
              <span className="hidden sm:inline">Search protocol, assets, or Step ID</span>
            </span>
            <span className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px]">⌘K</span>
          </button>

          <div className="hidden shrink-0 items-center gap-2 2xl:flex">
            <span className="whitespace-nowrap rounded-md border border-border bg-surface-subtle px-2 py-1 text-[11px] text-text-secondary">TBCT-BR-001</span>
            <span className="whitespace-nowrap rounded-md border border-success-light bg-success-light px-2 py-1 text-[11px] text-success">Pilot ready</span>
          </div>

          <div className="hidden shrink-0 whitespace-nowrap text-xs text-text-secondary 2xl:block">{unsaved ? "Unsaved changes" : "Synced 09:14"}</div>
          <Button size="icon" variant="ghost" className="hidden shrink-0 sm:inline-flex"><Bell className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className="hidden shrink-0 sm:inline-flex"><HelpCircle className="h-4 w-4" /></Button>
          <button
            type="button"
            title={t("auth.logout")}
            onClick={() => void handleLogout()}
            className="flex shrink-0 items-center gap-2 rounded-panel border border-border bg-surface px-2 py-1.5 hover:bg-surface-hover"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-clinical-blue-light text-xs font-semibold text-clinical-blue">{identityInitials}</span>
            <span className="hidden max-w-[140px] truncate text-xs font-medium text-text-primary 2xl:block">{user?.email ?? "—"}</span>
          </button>
        </header>

        {/* Extra bottom clearance for the fixed mobile nav below, plus the
            iOS home-indicator safe area on top of that. Unchanged >=640px
            (no bottom nav there). */}
        <main className="pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-0">{children}</main>
      </div>

      {/* Compact bottom navigation for mobile — mirrors the two clinician-facing sidebar entries. */}
      {!showFullNav && (
        <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden">
          {clinicianNavItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px]",
                  active ? "text-clinical-blue" : "text-text-secondary",
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="truncate">{navLabel(item)}</span>
              </Link>
            );
          })}
        </nav>
      )}

      <Modal open={commandOpen} onClose={() => setCommandOpen(false)} title="Quick Navigation" description="Jump pages, search Step IDs, and run key actions">
        <div className="p-4">
          <div className="flex items-center gap-2 rounded-panel border border-border bg-surface-subtle px-3">
            <Search className="h-4 w-4 text-text-secondary" />
            <input autoFocus className={cn(inputClass, "border-0 bg-transparent px-0 focus:ring-0")} placeholder="e.g. STEP-07, Validation, Session 03" />
          </div>
          <div className="mt-4 grid gap-2">
            {visibleNavItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setCommandOpen(false)} className="flex items-center gap-3 rounded-panel border border-transparent px-3 py-3 hover:border-border hover:bg-surface-subtle">
                <item.icon className="h-4 w-4 text-clinical-blue" />
                <span className="text-sm text-text-primary">{navLabel(item)}</span>
              </Link>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
