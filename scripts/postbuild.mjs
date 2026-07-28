import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const distDir = path.join(root, "dist");
const sourceHosting = path.join(root, ".openai", "hosting.json");
const distHostingDir = path.join(distDir, ".openai");
const distMetaDir = path.join(distDir, "_appgen_meta");
const distServerDir = path.join(distDir, "server");

mkdirSync(distHostingDir, { recursive: true });
mkdirSync(distMetaDir, { recursive: true });
mkdirSync(distServerDir, { recursive: true });

copyFileSync(sourceHosting, path.join(distHostingDir, "hosting.json"));
copyFileSync(sourceHosting, path.join(distMetaDir, "appgarden.json"));

writeFileSync(
  path.join(distServerDir, "index.js"),
  [
    "/* Auto-generated for Sites packaging checks. */",
    "module.exports = {};",
    "",
  ].join("\n"),
);
