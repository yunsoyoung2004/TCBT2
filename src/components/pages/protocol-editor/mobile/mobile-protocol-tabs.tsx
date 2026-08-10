"use client";

import { useT } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

export type MobileProtocolTab = "steps" | "flow" | "prompt";

const TABS: MobileProtocolTab[] = ["steps", "flow", "prompt"];

// Brief §4's secondary navigation ([Steps] [Flow] [Prompt]) -- lets a
// clinician see all three exist without scrolling, and jump straight to
// any one of them. Sticky so it stays reachable while scrolling a long
// Steps list or Prompt Editor.
export function MobileProtocolTabs({ active, onChange }: { active: MobileProtocolTab; onChange: (tab: MobileProtocolTab) => void }) {
  const { t } = useT();
  const label = (tab: MobileProtocolTab) =>
    tab === "steps" ? t("protocolEditor.mobile.stepsTab") : tab === "flow" ? t("protocolEditor.mobile.flowTab") : t("protocolEditor.mobile.promptTab");

  return (
    <div className="sticky top-[88px] z-10 flex border-b border-border bg-surface px-2">
      {TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={cn(
            "flex min-h-[44px] flex-1 items-center justify-center border-b-2 text-sm font-semibold transition",
            active === tab ? "border-clinical-blue text-clinical-blue" : "border-transparent text-text-secondary",
          )}
        >
          {label(tab)}
        </button>
      ))}
    </div>
  );
}
