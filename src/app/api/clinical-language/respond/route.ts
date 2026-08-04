import { NextResponse } from "next/server";
import { clinicalProviderRequestSchema } from "@/lib/clinical-language/clinical-language-contract";
import { respondClinicalLanguage } from "@/lib/clinical-language/clinical-language-server";

type ClinicalProviderError = { type: "authentication" | "rate_limit" | "unknown" | "malformed_response"; message: string; retryable: boolean; requestId?: string };

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const payload = clinicalProviderRequestSchema.parse(await request.json());
    const result = await respondClinicalLanguage(payload);
    if ("error" in result) {
      const error = result.error as ClinicalProviderError;
      return NextResponse.json({ ok: false, error: { ...error, requestId } }, { status: error.type === "authentication" ? 401 : error.type === "rate_limit" ? 429 : 500 });
    }
    return NextResponse.json({ ok: true, data: result, requestId });
  } catch (error) {
    return NextResponse.json({ ok: false, error: { type: "unknown", message: "Invalid request", retryable: false, requestId } }, { status: 400 });
  }
}
