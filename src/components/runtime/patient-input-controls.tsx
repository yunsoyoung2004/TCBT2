"use client";

import { useEffect, useRef, useState } from "react";
import { Button, inputClass } from "@/components/ui/primitives";
import type { PromptItem } from "@/lib/protocol/source-fidelity-types";
import type { PatientInput } from "@/types/runtime-session";
import { useSpeechRecognition } from "@/lib/speech/use-speech-recognition";

type PatientPromptInput = Pick<PromptItem, "type" | "validation" | "outputFields">;

export function PatientInputControls({
  payload,
  promptItem,
  disabled,
  onSubmit,
  locale,
  onBeforeMic,
}: {
  payload?: Record<string, unknown>;
  promptItem?: PatientPromptInput;
  disabled?: boolean;
  onSubmit: (input: PatientInput) => void;
  locale?: string;
  onBeforeMic?: () => void;
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
      <TextInput
        disabled={disabled}
        placeholder={String(payload?.placeholder ?? "Write or speak your response...")}
        locale={locale}
        onBeforeMic={onBeforeMic}
        onSubmit={(value) => onSubmit({ kind: "text", value })}
      />
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

function TextInput({
  disabled,
  placeholder,
  locale,
  onBeforeMic,
  onSubmit,
}: {
  disabled?: boolean;
  placeholder: string;
  locale?: string;
  onBeforeMic?: () => void;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  const speech = useSpeechRecognition(locale ?? "en-US");
  const latestValueRef = useRef(value);
  latestValueRef.current = value;
  const voiceTurnActiveRef = useRef(false);

  const submitValue = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue("");
  };

  // Recognition runs continuous (see use-speech-recognition.ts) so a
  // mid-thought pause no longer ends the turn on its own -- submission now
  // happens once, right when listening actually stops (the participant
  // pressed the mic again to say "I'm done", or the browser ended the
  // session on its own), using whatever was transcribed by then. This only
  // fires for a turn that was actually started by voice (voiceTurnActiveRef),
  // never for ordinary typing.
  useEffect(() => {
    if (voiceTurnActiveRef.current && !speech.listening) {
      voiceTurnActiveRef.current = false;
      submitValue(latestValueRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.listening]);

  const handleMicClick = () => {
    if (speech.listening) {
      speech.stop();
      return;
    }
    // Voice input takes priority: interrupt any playback before we start listening.
    onBeforeMic?.();
    voiceTurnActiveRef.current = true;
    const started = speech.start((text) => setValue(text));
    if (!started) voiceTurnActiveRef.current = false;
  };

  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        submitValue(value);
      }}
    >
      <input
        name="message"
        // Without this, the browser's own form-autofill offers every
        // previously typed answer (from this or an earlier session) as a
        // dropdown under the field -- surfacing old input history the
        // participant didn't ask to see, sometimes visually covering the
        // field itself, and re-exposing something hard to say that they'd
        // already moved past. This field is never meant to be "remembered."
        autoComplete="off"
        className={inputClass}
        placeholder={placeholder}
        disabled={disabled}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      {speech.supported && (
        <Button
          type="button"
          variant={speech.listening ? "danger" : "secondary"}
          disabled={disabled}
          aria-label={speech.listening ? "Stop listening" : "Speak your response"}
          onClick={handleMicClick}
        >
          {speech.listening ? "⏺" : "🎤"}
        </Button>
      )}
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
