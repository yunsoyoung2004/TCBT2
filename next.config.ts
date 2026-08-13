import path from "path";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const createNextConfig = (phase: string): NextConfig => {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    distDir: isDev ? ".next" : process.env.NEXT_OUTPUT_DIR || "dist",
    outputFileTracingRoot: path.join(__dirname),
  };
};

// Wraps for Sentry's build-time instrumentation regardless of whether
// SENTRY_DSN is set -- withSentryConfig itself is a no-op-safe wrapper (it
// just skips sourcemap upload when SENTRY_AUTH_TOKEN/ORG/PROJECT aren't
// configured, logging a notice rather than failing the build). Silenced
// since this repo has neither of those set up yet.
export default withSentryConfig(createNextConfig, { silent: true, webpack: { treeshake: { removeDebugLogging: true } } });
