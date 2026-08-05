"use client";

import { useState } from "react";
import { Button, inputClass } from "@/components/ui/primitives";
import type { PromptItem } from "@/lib/protocol/source-fidelity-types";
import type { PatientInput } from "@/types/runtime-session";

type PatientPromptInput = Pick<PromptItem, "type" | "validation" | "outputFields">;

export function PatientInputControls({
  payload,
  promptItem,
  disabled,
  onSubmit,
}: {
  payload?: Record<string, unknown>;
  promptItem?: PatientPromptInput;
  disabled?: boolean;
  onSubmit: (input: PatientInput) => void;
}) {
  const validation = promptItem?.validation ?? {};
  const promptValidationKind = typeof validation.kind === "string" ? validation.kind : "";
  const choices = Array.isArray(payload?.choices)
    ? payload.choices.map(String)
    : Array.isArray(validation.choices)
      ? validation.choices.map(String)
      : Array.isArray(validation.values)
        ? validation.values.map(String)
      : [];
  const kind = String((payload?.kind ?? payload?.inputKind ?? (promptValidationKind === "enum" ? "single_choice" : promptValidationKind)) || "text");
  const promptKind = String(promptItem?.type ?? "");
  if (/^paired_ratings/.test(promptValidationKind)) {
    return <PairedRatingInput disabled={disabled} min={Number(validation.min ?? 0)} max={Number(validation.max ?? 100)} fields={promptItem?.outputFields ?? []} onSubmit={(first, second) => onSubmit({ kind: "rating", value: `${first}, ${second}` })} />;
  }
  if (kind === "single_choice") {
    return (
      <div className="grid gap-2">
        {choices.map((choice) => (
          <Button key={choice} variant="secondary" disabled={disabled} onClick={() => onSubmit({ kind: "single_choice", value: choice })}>{choice}</Button>
        ))}
      </div>
    );
  }
  if (kind === "multi_choice") {
    return <MultiChoiceInput choices={choices} disabled={disabled} onSubmit={(value) => onSubmit({ kind: "multi_choice", value })} />;
  }
  if (kind === "rating" || promptKind === "rating" || promptValidationKind === "rating") {
    return <RatingInput disabled={disabled} min={Number(payload?.min ?? validation.min ?? 0)} max={Number(payload?.max ?? validation.max ?? 100)} onSubmit={(value) => onSubmit({ kind: "rating", value })} />;
  }
  if (kind === "activity_completion") {
    return <ChoiceRow disabled={disabled} options={["not_started", "partial", "completed"]} onSelect={(value) => onSubmit({ kind: "activity_completion", value })} />;
  }
  if (kind === "homework_status") {
    return <ChoiceRow disabled={disabled} options={["not_assigned", "pending", "completed"]} onSelect={(value) => onSubmit({ kind: "homework_status", value })} />;
  }
  if (kind === "boolean") {
    return (
      <div className="flex gap-2">
        <Button variant="secondary" disabled={disabled} onClick={() => onSubmit({ kind: "boolean", value: true })}>Yes</Button>
        <Button variant="secondary" disabled={disabled} onClick={() => onSubmit({ kind: "boolean", value: false })}>No</Button>
      </div>
    );
  }
  return (
    <div className="grid gap-3">
      <TextInput disabled={disabled} placeholder={String(payload?.placeholder ?? "Write your response...")} onSubmit={(value) => onSubmit({ kind: "text", value })} />
    </div>
  );
}

function readableFieldLabel(field: string, index: number) {
  if (/belief/i.test(field)) return "Belief in the charge (%)";
  if (/emotion|intensity/i.test(field)) return "Emotion intensity (%)";
  return `Rating ${index + 1} (%)`;
}

function PairedRatingInput({ disabled, min, max, fields, onSubmit }: { disabled?: boolean; min: number; max: number; fields: string[]; onSubmit: (first: number, second: number) => void }) {
  const initial = Math.round((min + max) / 2);
  const [first, setFirst] = useState(initial);
  const [second, setSecond] = useState(initial);
  return (
    <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); onSubmit(first, second); }}>
      {[[first, setFirst], [second, setSecond]].map(([value, setter], index) => (
        <label key={index} className="grid gap-1 text-sm text-text-secondary">
          {readableFieldLabel(fields[index] ?? "", index)}
          <input type="number" min={min} max={max} value={value as number} disabled={disabled} onChange={(event) => (setter as (value: number) => void)(Math.max(min, Math.min(max, Number(event.target.value))))} className={inputClass} />
        </label>
      ))}
      <Button disabled={disabled}>Submit both ratings</Button>
    </form>
  );
}

function TextInput({ disabled, placeholder, onSubmit }: { disabled?: boolean; placeholder: string; onSubmit: (value: string) => void }) {
  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const value = String(form.get("message") ?? "").trim();
        if (!value) return;
        onSubmit(value);
        event.currentTarget.reset();
      }}
    >
      <input name="message" className={inputClass} placeholder={placeholder} disabled={disabled} />
      <Button disabled={disabled}>Send</Button>
    </form>
  );
}

function RatingInput({ disabled, min, max, onSubmit }: { disabled?: boolean; min: number; max: number; onSubmit: (value: number) => void }) {
  const initialValue = String(Math.max(min, Math.min(max, Math.round((min + max) / 2))));
  const [value, setValue] = useState(initialValue);
  return (
    <form
      className="grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const numericValue = Number.parseFloat(value);
        if (Number.isNaN(numericValue)) return;
        onSubmit(Math.max(min, Math.min(max, numericValue)));
      }}
    >
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={disabled}
          className="w-full accent-[var(--clinical-blue)]"
        />
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={disabled}
          className={`${inputClass} w-24`}
        />
      </div>
      <Button disabled={disabled}>Submit rating</Button>
    </form>
  );
}

function ChoiceRow({ disabled, options, onSelect }: { disabled?: boolean; options: string[]; onSelect: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Button key={option} variant="secondary" disabled={disabled} onClick={() => onSelect(option)}>
          {option.replace(/_/g, " ")}
        </Button>
      ))}
    </div>
  );
}

function MultiChoiceInput({ choices, disabled, onSubmit }: { choices: string[]; disabled?: boolean; onSubmit: (value: string[]) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (choice: string) => {
    setSelected((current) => (current.includes(choice) ? current.filter((item) => item !== choice) : [...current, choice]));
  };
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {choices.map((choice) => (
          <Button key={choice} type="button" variant={selected.includes(choice) ? "primary" : "secondary"} disabled={disabled} onClick={() => toggle(choice)}>
            {choice}
          </Button>
        ))}
      </div>
      <Button disabled={disabled || !selected.length} onClick={() => onSubmit(selected)}>
        Submit selection
      </Button>
    </div>
  );
}
