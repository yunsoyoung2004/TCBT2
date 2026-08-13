import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

// Server-only Supabase client using the service-role key -- this bypasses
// RLS and Auth entirely (full admin access), so it must never be imported
// from a client component and must never have its key exposed to the
// browser (SUPABASE_SERVICE_ROLE_KEY, unlike NEXT_PUBLIC_SUPABASE_ANON_KEY,
// carries no NEXT_PUBLIC_ prefix on purpose). Its only job here is the one
// thing nothing else in this app can do: resolving a Supabase Auth user id
// to their email, and enumerating registered clinicians -- there is no
// clinician-profile table, and no way to look up another user's identity
// through an ordinary (anon-key) client, which only ever sees the calling
// user's own session.
let client: ReturnType<typeof createClient> | undefined;

function getAdminClient() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not configured.");
  }
  client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    // supabase-js always initializes a Realtime sub-client, which needs a
    // WebSocket constructor -- Node 20 (this project's runtime) has none as
    // a global (added only in Node 21+), so without this the client throws
    // immediately on construction. This admin client never subscribes to
    // anything, but still has to satisfy the constructor.
    realtime: { transport: WebSocket as unknown as never },
  });
  return client;
}

/** Every registered clinician's email -- used to decide who receives a
 * safety-alert email (src/lib/notifications/send-safety-alert.ts) when no
 * specific clinician is assigned to the participant yet. Paginates through
 * every registered user since `listUsers` caps at 1000/page by default;
 * fine at this app's current scale, revisit if the clinician roster grows
 * into the thousands. */
export async function listClinicianEmails(): Promise<string[]> {
  const admin = getAdminClient();
  const emails: string[] = [];
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const user of data.users) {
      if (user.user_metadata?.role === "clinician" && user.email) emails.push(user.email);
    }
    if (data.users.length < 1000) break;
    page += 1;
  }
  return emails;
}

/** Resolves a single auth user id to their email -- used to display
 * `RuntimeParticipant.assignedClinician` (a raw auth user id) as a real
 * email in the clinician-facing UI, and to email a specific assigned
 * clinician directly instead of the whole roster. Returns null if the user
 * no longer exists (e.g. deleted account). */
export async function getUserEmail(userId: string): Promise<string | null> {
  const admin = getAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) return null;
  return data.user.email ?? null;
}
