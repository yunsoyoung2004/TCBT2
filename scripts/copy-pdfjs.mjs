import { copyFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceFile = path.join(rootDir, "node_modules", "pdfjs-dist", "legacy", "build", "pdf.mjs");
const sourceWorkerFile = path.join(rootDir, "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs");
const targetDir = path.join(rootDir, "public", "vendor", "pdfjs");
const targetFile = path.join(targetDir, "pdf.mjs");
const targetWorkerFile = path.join(targetDir, "pdf.worker.mjs");

try {
  await access(sourceFile);
  await access(sourceWorkerFile);
} catch {
  throw new Error(`Missing source PDF.js module: ${sourceFile}`);
}

await mkdir(targetDir, { recursive: true });
await copyFile(sourceFile, targetFile);
await copyFile(sourceWorkerFile, targetWorkerFile);

console.log(`Copied PDF.js to ${targetFile}`);
console.log(`Copied PDF worker to ${targetWorkerFile}`);