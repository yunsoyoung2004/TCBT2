import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const outputDirectory = process.env.VERCEL ? ".next" : "distbuild";
const environment = { ...process.env, NEXT_OUTPUT_DIR: outputDirectory };

function run(command, argumentsList) {
  const result = spawnSync(command, argumentsList, { cwd: root, env: environment, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(process.execPath, [path.join(root, "node_modules", "next", "dist", "bin", "next"), "build"]);
run(process.execPath, [path.join(root, "scripts", "postbuild.mjs")]);