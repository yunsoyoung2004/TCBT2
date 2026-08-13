import { NextResponse } from "next/server";
// Direct server-side store imports, NOT the fetch-based
// @/lib/api/participant-api / @/lib/api/runtime-session-api (those go
// through repositories whose callStore() hits "/api/*/store" over HTTP --
// fine from a browser, but those routes require a logged-in caller's
// session cookie, which a cron job never has. This route's own trust
// boundary is isAuthorizedCronRequest() below, so it reads straight from
// Postgres instead, the same way src/lib/supabase/admin.ts bypasses
// per-user auth with the service-role key.
import { listParticipants } from "@/lib/server/participant-store";
import { listRuntimeSessionRecords } from "@/lib/server/runtime-session-store";
import { getUserEmail } from "@/lib/supabase/admin";
import { sendSessionReminderEmail } from "@/lib/notifications/send-session-reminder";
import type { RuntimeSession } from "@/types/runtime-session";

export const runtime = "nodejs";
// Cron runs can take a while once the participant pool grows -- give the
// batch loop below real headroom instead of hitting Vercel's default limit.
export const maxDuration = 60;

const TERMINAL_STATUSES = new Set<RuntimeSession["status"]>(["completed", "terminated", "failed"]);
const DEFAULT_STALE_DAYS_THRESHOLD = 7;

function daysSince(value: string): number {
  return Math.floor((Date.now() - new Date(value).getTime()) / (1000 * 60 * 60 * 24));
}

function mostRecentSession(sessions: RuntimeSession[]): RuntimeSession | undefined {
  if (!sessions.length) return undefined;
  return [...sessions].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
}

// Vercel's Cron feature automatically attaches `Authorization: Bearer
// $CRON_SECRET` to requests it sends, once CRON_SECRET is set as a project
// env var -- this rejects everything else, including a guessed URL hit
// directly from a browser.
function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/** Daily job: reminds patients who have an incomplete session and have gone
 * quiet for REMINDER_STALE_DAYS_THRESHOLD+ days (default 7, tunable via env).
 * Skips participants with no linked auth account (e.g. the pre-auth demo
 * participant) -- there's no email to send to. */
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 401 });
  }
  const thresholdDays = Number(process.env.REMINDER_STALE_DAYS_THRESHOLD) || DEFAULT_STALE_DAYS_THRESHOLD;
  try {
    const [participants, sessions] = await Promise.all([listParticipants(), listRuntimeSessionRecords()]);
    let remindersSent = 0;
    let skippedNoEmail = 0;
    for (const participant of participants) {
      if (!participant.authUserId) {
        skippedNoEmail++;
        continue;
      }
      const ownSessions = sessions.filter((session) => session.participantId === participant.id);
      const current = mostRecentSession(ownSessions);
      if (!current || TERMINAL_STATUSES.has(current.status)) continue;
      const staleDays = daysSince(current.updatedAt);
      if (staleDays < thresholdDays) continue;
      const email = await getUserEmail(participant.authUserId);
      if (!email) {
        skippedNoEmail++;
        continue;
      }
      await sendSessionReminderEmail({ participantId: participant.id, patientEmail: email, staleDays, locale: participant.locale });
      remindersSent++;
    }
    return NextResponse.json({ ok: true, remindersSent, skippedNoEmail, thresholdDays });
  } catch (error) {
    console.error("[cron/reminders] failed", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Reminder job failed." }, { status: 500 });
  }
}
