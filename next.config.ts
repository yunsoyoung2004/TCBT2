import path from "path";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import type { NextConfig } from "next";

const createNextConfig = (phase: string): NextConfig => {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    distDir: isDev ? ".next" : process.env.NEXT_OUTPUT_DIR || "dist",
    outputFileTracingRoot: path.join(__dirname),
  };
};

export default createNextConfig;
