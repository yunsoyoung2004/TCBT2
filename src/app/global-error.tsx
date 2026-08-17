"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Catches errors React itself can't recover from (root layout, top-level
// render crashes) -- Next.js requires this to render its own <html>/<body>
// since it replaces the entire tree, including the layout that would
// normally provide them. Sentry.captureException no-ops if SENTRY_DSN was
// never set (see instrumentation-client.ts).
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 16, color: "#172033" }}>Something went wrong.</p>
            <p style={{ fontSize: 13, color: "#526174" }}>문제가 발생했습니다. 잠시 후 다시 시도해주세요.</p>
          </div>
        </div>
      </body>
    </html>
  );
}
