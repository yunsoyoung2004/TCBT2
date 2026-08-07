"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { motion } from "framer-motion";
import { Button, Modal } from "@/components/ui/primitives";
import { fadeScale } from "@/lib/motion/motion-variants";
import { useReducedMotionPreference } from "@/lib/motion/use-reduced-motion-preference";
import type { SessionFigureConfig } from "@/lib/worksheet/figure-registry/types";
import type { WorksheetFieldView, WorksheetView } from "@/types/worksheet";

// Generic "source figure + live data overlay" workspace, reused across every
// session's figure config. The original TBCT figure (config.assetSrc) is
// Layer 1 and never moves or gets redrawn -- every field's current value is
// an absolutely-positioned overlay at figure-relative (0-1) coordinates, so
// alignment survives resizing, zoom, and different viewports. This
// component owns only presentation; all persistence/validation continues
// through worksheet-projection.ts exactly as before (onConfirm/onEdit are
// passed straight through from WorksheetPane, unchanged).

type ZoomLevel = "fit" | 1 | 1.25 | 1.5;

export function FigureWorkspace({
  config,
  view,
  activeCanonicalFieldKey,
  onConfirm,
  onEdit,
  busy,
}: {
  config: SessionFigureConfig;
  view: WorksheetView;
  activeCanonicalFieldKey?: string;
  onConfirm: (worksheetFieldKey: string) => void;
  onEdit: (worksheetFieldKey: string, value: unknown) => void;
  busy: boolean;
}) {
  const reducedMotion = Boolean(useReducedMotionPreference());
  const [zoom, setZoom] = useState<ZoomLevel>("fit");
  const byCanonicalKey = new Map(view.fields.map((field) => [field.binding.canonicalFieldKey, field]));
  const aspectRatio = config.assetWidth / config.assetHeight;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-1.5">
        <Button size="sm" variant={zoom === "fit" ? "secondary" : "ghost"} onClick={() => setZoom("fit")}>Fit</Button>
        <Button size="sm" variant={zoom === 1 ? "secondary" : "ghost"} onClick={() => setZoom(1)}>100%</Button>
        <Button size="sm" variant="ghost" onClick={() => setZoom((current) => (current === "fit" ? 1.25 : current === 1 ? 1.25 : current === 1.25 ? 1.5 : 1.5))} aria-label="Zoom in">+</Button>
        <Button size="sm" variant="ghost" onClick={() => setZoom((current) => (current === 1.5 ? 1.25 : current === 1.25 ? 1 : "fit"))} aria-label="Zoom out">−</Button>
      </div>
      <div className="overflow-auto rounded-panel border border-border bg-surface-subtle/40 p-2">
        <div
          className="relative mx-auto bg-white shadow-sm"
          style={{
            aspectRatio: String(aspectRatio),
            width: zoom === "fit" ? "100%" : `${(zoom as number) * 100}%`,
            maxWidth: zoom === "fit" ? "100%" : "none",
          }}
        >
          <img src={config.assetSrc} alt="" className="absolute inset-0 h-full w-full select-none" draggable={false} />
          {config.regions.map((fieldRegion) => (
            <FigureRegionOverlay
              key={fieldRegion.id}
              region={fieldRegion}
              field={byCanonicalKey.get(fieldRegion.runtimeField)}
              active={fieldRegion.runtimeField === activeCanonicalFieldKey}
              onConfirm={onConfirm}
              onEdit={onEdit}
              busy={busy}
              reducedMotion={reducedMotion}
            />
          ))}
        </div>
      </div>
      <p className="text-center text-[11px] text-text-muted">{config.sourceNote}</p>
    </div>
  );
}

function FigureRegionOverlay({
  region,
  field,
  active,
  onConfirm,
  onEdit,
  busy,
  reducedMotion,
}: {
  region: SessionFigureConfig["regions"][number];
  field: WorksheetFieldView | undefined;
  active: boolean;
  onConfirm: (worksheetFieldKey: string) => void;
  onEdit: (worksheetFieldKey: string, value: unknown) => void;
  busy: boolean;
  reducedMotion: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(field?.value?.displayValue ?? "");
  const style = { left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${region.width * 100}%`, height: `${region.height * 100}%` };

  if (region.display === "choice") {
    const currentValue = field?.value?.value;
    return (
      <div className="absolute" style={style}>
        {region.choiceOptions?.map((option) => {
          const checked = currentValue === option.value;
          return (
            <div
              key={option.value}
              className={`absolute flex items-center justify-center rounded-[3px] transition ${checked ? "bg-clinical-blue/90" : ""} ${active ? "ring-2 ring-clinical-blue ring-offset-1" : ""}`}
              style={{ left: `${option.x * 100}%`, top: `${option.y * 100}%`, width: `${option.size * 100}%`, height: `${option.size * 100}%` }}
              title={option.label}
            >
              {checked && <span className="text-[10px] leading-none text-white">✓</span>}
            </div>
          );
        })}
      </div>
    );
  }

  const filled = field?.value?.value !== undefined && field?.value?.value !== "";
  const draftPending = field?.value?.status === "draft_extracted";
  const confirmed = field?.value?.status === "participant_confirmed";
  const displayValue = field?.value?.displayValue ?? "";
  const isList = region.display === "list" && Array.isArray(field?.value?.value);

  return (
    <div
      className={`group absolute overflow-hidden rounded-[2px] transition-all duration-200 ${active ? "bg-clinical-blue/10 ring-2 ring-clinical-blue" : filled ? "hover:ring-1 hover:ring-clinical-blue/40" : ""}`}
      style={style}
    >
      {editing ? (
        <div className="absolute inset-0 z-20 flex flex-col gap-1 bg-white/95 p-1">
          <textarea
            className="min-h-0 flex-1 resize-none rounded-[2px] border border-clinical-blue bg-white p-1 text-[11px] leading-tight text-text-primary outline-none"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            autoFocus
          />
          <div className="flex gap-1">
            <Button size="sm" disabled={busy} onClick={() => { onEdit(region.runtimeField, region.display === "percent" ? Number(draft) : draft); setEditing(false); }}>Save</Button>
            <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="flex h-full w-full flex-col items-stretch justify-start overflow-hidden p-0.5 text-left"
          onClick={() => filled && setExpanded(true)}
          disabled={!filled}
        >
          {filled && (
            <motion.span
              className="block overflow-hidden text-text-primary"
              style={{ fontSize: `${0.72 * (region.fontScale ?? 1)}rem`, lineHeight: 1.15, display: "-webkit-box", WebkitLineClamp: isList ? undefined : 4, WebkitBoxOrient: "vertical" }}
              variants={reducedMotion ? undefined : fadeScale}
              initial={reducedMotion ? false : "initial"}
              animate={reducedMotion ? undefined : "animate"}
            >
              {region.display === "percent" ? `${displayValue}` : isList ? (field?.value?.value as unknown[]).map((item) => String(item)).join(", ") : displayValue}
            </motion.span>
          )}
        </button>
      )}

      {!editing && (draftPending || (filled && field?.binding.participantOwned)) && (
        <div className="pointer-events-none absolute -bottom-1 left-0 flex translate-y-full gap-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
          {draftPending && <Button size="sm" onClick={() => onConfirm(region.runtimeField)} disabled={busy}>Confirm</Button>}
          <Button size="sm" variant="secondary" onClick={() => { setDraft(field?.value?.displayValue ?? ""); setEditing(true); }} disabled={busy}>Edit</Button>
        </div>
      )}
      {confirmed && <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-success" aria-label="confirmed" />}

      <Modal open={expanded} onClose={() => setExpanded(false)} title={field?.binding.label ?? "Response"}>
        <div className="whitespace-pre-wrap p-5 text-sm text-text-primary">
          {isList ? (
            <ul className="list-inside list-disc space-y-1">
              {(field?.value?.value as unknown[]).map((item, index) => <li key={index}>{String(item)}</li>)}
            </ul>
          ) : (
            field?.value?.displayValue
          )}
        </div>
      </Modal>
    </div>
  );
}
