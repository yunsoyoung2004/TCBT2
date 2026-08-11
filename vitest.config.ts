import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // Matches Next.js's own automatic JSX runtime (tsconfig.json has
  // jsx:"preserve" since SWC does the real transform for the app build --
  // esbuild's default "transform" mode expects a classic `React` in
  // scope, which no .tsx source file in this project provides).
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    environmentOptions: { jsdom: { url: "http://localhost:3000" } },
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
