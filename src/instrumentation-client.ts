// Browser Sentry init. Deliberately does nothing until NEXT_PUBLIC_SENTRY_DSN
// is set as an env var -- Sentry.init with an empty dsn just disables the
// SDK, so this is safe to ship even before anyone's created a Sentry
// project; it activates the moment the DSN is added, no code change needed.
//
// No Session Replay, no sendDefaultPii: this app's error surface is a real
// patient's CBT session -- a replay or a captured request body could carry
// the actual clinical conversation content into a third-party monitoring
// tool. beforeSend strips request/extra data as a blunt safety net (losing
// some debug context is the right trade here, not leaking it).
import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request) delete event.request.data;
      event.extra = undefined;
      return event;
    },
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
