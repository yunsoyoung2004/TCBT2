// Server + edge runtime Sentry init. No-ops safely (SDK stays disabled)
// until SENTRY_DSN is set -- see instrumentation-client.ts's own comment
// for why this is deliberately opt-in rather than something that could
// break the build/runtime for anyone who hasn't set up a Sentry project.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (!process.env.SENTRY_DSN) return;
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      // Mental-health clinical content in request bodies/messages must
      // never leave this deployment as a side effect of turning on error
      // monitoring -- see instrumentation-client.ts's beforeSend for the
      // matching client-side redaction. Sentry's default PII scrubbing
      // covers common patterns; sendDefaultPii stays false (its default)
      // so request bodies aren't attached at all.
      sendDefaultPii: false,
    });
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
