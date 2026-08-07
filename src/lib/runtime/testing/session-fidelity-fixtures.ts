import type { PromptItem } from "@/lib/protocol/source-fidelity-types";
import type { PatientInput } from "@/types/runtime-session";

function validationOf(prompt: PromptItem) {
  return (prompt.validation ?? {}) as { kind?: string; values?: Array<string | number>; min?: number; max?: number };
}

/** Validation kinds whose two output fields must sum to 100 (e.g. the
 * Consensus chair's advantage/disadvantage re-weighting). A generic
 * "value, value-1" synthetic pair would violate that constraint and get
 * legitimately rejected by the completion gate. */
const SUM_TO_100_PAIR_KINDS = new Set(["consensus_weights"]);

// Content-aware, rotating reply pools, one per clinical-content category a
// field name commonly falls into. Each field name gets its own rotation
// counter so repeatedly hitting the same field (a revisited node, a
// multi-round rating loop) cycles through different phrasing instead of
// the same canned line every time -- a flat template string here reads as
// a real patient repeating themselves turn after turn, which is exactly
// the fidelity-check noise this fixture exists to avoid.
const CONTENT_POOLS: Array<{ pattern: RegExp; replies: string[] }> = [
  { pattern: /situation/i, replies: [
    "My manager criticized my report in front of the whole team yesterday.",
    "My partner sent a text saying we needed to talk, and I started spiraling.",
    "I walked into the meeting five minutes late and everyone stopped talking.",
    "A close friend didn't reply to my message for two days.",
  ] },
  { pattern: /automaticThought|workingAutomaticThought|underlyingBelief/i, replies: [
    "I immediately thought, I'm going to get fired for this.",
    "My mind just said, everyone here thinks I'm incompetent.",
    "I thought, I always mess things up eventually.",
    "The thought was, this proves I can't be trusted with anything important.",
  ] },
  { pattern: /coreBelief|positiveBelief/i, replies: [
    "I guess deep down it means I'm not good enough.",
    "I think it means I'll always end up alone.",
    "Maybe it means I'm fundamentally unlovable.",
    "I suppose it means I'm a failure at the things that matter.",
  ] },
  { pattern: /emotion/i, replies: [
    "Mostly anxious, honestly, maybe around 70%.",
    "I felt embarrassed and a little angry at myself.",
    "Just really sad, more than I expected.",
    "Overwhelmed, like everything was piling up at once.",
  ] },
  { pattern: /bodySensation/i, replies: [
    "My heart was racing and my hands felt shaky.",
    "I noticed my chest getting tight and my breathing speeding up.",
    "There was a knot in my stomach the whole time.",
    "My shoulders and jaw got really tense.",
  ] },
  { pattern: /behavior|reaction/i, replies: [
    "I left the meeting early and avoided everyone for the rest of the day.",
    "I stayed quiet and didn't say anything back.",
    "I texted an apology right away, even though I wasn't sure I needed to.",
    "I just kept scrolling my phone to avoid thinking about it.",
  ] },
  { pattern: /evidence/i, replies: [
    "My manager actually thanked me for a report last month.",
    "I've met every deadline this quarter without missing one.",
    "A coworker told me my presentation last week was clear and helpful.",
    "I handled a similar situation fine back in the spring.",
  ] },
  { pattern: /goal/i, replies: [
    "Getting a full night's sleep most nights.",
    "Speaking up in meetings without panicking beforehand.",
    "Spending more real time with my kids on weekends.",
    "Finishing the project I've been putting off for months.",
  ] },
  { pattern: /problem/i, replies: [
    "I keep putting off things at work until the last minute.",
    "I've been avoiding calls from my family for weeks.",
    "I snap at my partner over small things more than I'd like.",
    "I can't seem to fall asleep before 2am most nights.",
  ] },
  { pattern: /symptom/i, replies: [
    "Crowded elevators make my heart start pounding.",
    "I avoid answering the phone when I don't recognize the number.",
    "Group presentations make my hands shake for hours beforehand.",
    "I skip family gatherings when there'll be more than a few people.",
  ] },
  { pattern: /summary/i, replies: [
    "So basically, the thought fed the feeling, and the feeling made me pull away from people.",
    "I noticed the thought first, then the emotion, and then I acted on it by avoiding the situation.",
    "It sounds like one bad moment turned into a whole story about myself that isn't really true.",
  ] },
  // Checked before the broader /participation/i pattern below, which would
  // otherwise match this field name too and return a contributor's NAME in
  // response to "How does that feel to you now?".
  { pattern: /participationRatingStable/i, replies: ["That feels about right to me now.", "Yeah, that seems to fit better."] },
  { pattern: /participation|contributor/i, replies: ["My coworker who missed the deadline first", "My manager for not checking in sooner", "Myself, for not raising it earlier"] },
  // role_transition prompts (S07/S08 chair-switching) validate with
  // requiresThirdPerson: any first-person pronoun without an accompanying
  // third-person one is rejected -- keep these confirmations third-person-safe.
  { pattern: /RoleReady|roleReady|juryOrientation/i, replies: [
    "The defendant is ready to hear from the prosecutor now.",
    "The patient has moved into the other chair and is ready to continue.",
    "They are ready for the next chair to speak.",
  ] },
];

let genericCounter = 0;
const fieldCounters = new Map<string, number>();

function nextReply(field: string): string {
  const bucket = CONTENT_POOLS.find((entry) => entry.pattern.test(field));
  if (bucket) {
    const index = fieldCounters.get(field) ?? 0;
    fieldCounters.set(field, index + 1);
    return bucket.replies[index % bucket.replies.length];
  }
  genericCounter += 1;
  // Kept pronoun-neutral (no bare first-person without a paired third-person
  // pronoun) since a few prompts in this catalog validate with
  // requiresThirdPerson and this fallback has no way to know which ones do.
  const fallback = [
    `That's a fair way to describe the ${field.replace(/([A-Z])/g, " $1").toLowerCase().trim()} here.`,
    `That sounds close to what actually happened.`,
    `Yes, that matches it pretty well.`,
  ];
  return fallback[genericCounter % fallback.length];
}

export function syntheticPatientInput(prompt: PromptItem): PatientInput {
  const validation = validationOf(prompt);
  const fields = prompt.outputFields;
  if (validation.kind === "boolean") return { kind: "boolean", value: true };
  if (validation.kind === "enum" && validation.values?.length) return { kind: "single_choice", value: String(validation.values[0]) };
  if (validation.kind && SUM_TO_100_PAIR_KINDS.has(validation.kind) && fields.length === 2) {
    return { kind: "rating", value: "60, 40" };
  }
  // participationRatingStable is a free-text reflection field ("How does
  // that feel to you now?"), not a number -- excluded despite containing
  // "Rating" so the synthetic reply is realistic natural language.
  if (validation.kind === "rating" || validation.kind === "paired_ratings" || fields.some((field) => field !== "participationRatingStable" && /percent|rating|score|weight|intensit/i.test(field))) {
    const max = validation.max ?? 100;
    const value = Math.max(validation.min ?? 0, Math.min(max, max >= 10 ? 55 : max));
    return { kind: "rating", value: fields.map((_, index) => String(Math.max(validation.min ?? 0, value - index))).join(", ") || String(value) };
  }
  if (fields.length > 1) {
    // Multi-field prompts are parsed by an explicit "field: value" regex
    // (runtime-context.ts) rather than free text, so the field-name prefix
    // must stay -- only the reply text after the colon is varied here.
    return { kind: "text", value: fields.map((field) => `${field}: ${nextReply(field)}`).join("; ") };
  }
  const field = fields[0] ?? "response";
  return { kind: "text", value: nextReply(field) };
}

export const insufficientPatientInputs: PatientInput[] = [
  { kind: "text", value: "몰라" },
  { kind: "text", value: "그냥" },
  { kind: "text", value: "싫어요" },
  { kind: "text", value: "잘 모르겠어요" },
];
