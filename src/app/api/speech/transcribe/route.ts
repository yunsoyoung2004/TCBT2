import { NextResponse } from "next/server";

export const runtime = "nodejs";
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    if (process.env.ALLOW_CLOUD_PATIENT_ASSESSMENT !== "true") return NextResponse.json({ ok: false, error: "Cloud speech transcription is disabled." }, { status: 403 });
    const apiKey = process.env.GROQ_API_KEY ?? "";
    const model = process.env.GROQ_TRANSCRIPTION_MODEL ?? "";
    if (!apiKey || !model) return NextResponse.json({ ok: false, error: "Groq speech transcription is not configured." }, { status: 503 });
    const incoming = await request.formData();
    const audio = incoming.get("audio");
    const locale = String(incoming.get("locale") ?? "");
    if (!(audio instanceof File) || !audio.size || audio.size > MAX_AUDIO_BYTES) return NextResponse.json({ ok: false, error: "A recording up to 10 MB is required." }, { status: 400 });
    const form = new FormData();
    form.set("file", audio, audio.name || "recording.webm");
    form.set("model", model);
    form.set("response_format", "json");
    form.set("temperature", "0");
    const language = locale.toLowerCase().startsWith("pt") ? "pt" : locale.toLowerCase().startsWith("ko") ? "ko" : locale.toLowerCase().startsWith("en") ? "en" : "";
    if (language) form.set("language", language);
    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { authorization: `Bearer ${apiKey}` }, body: form });
    if (!response.ok) return NextResponse.json({ ok: false, error: `Speech transcription failed (${response.status}).` }, { status: 502 });
    const result = await response.json() as { text?: unknown };
    const text = typeof result.text === "string" ? result.text.trim() : "";
    if (!text) return NextResponse.json({ ok: false, error: "No speech was recognized." }, { status: 422 });
    return NextResponse.json({ ok: true, data: { text } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Speech transcription failed." }, { status: 500 });
  }
}
