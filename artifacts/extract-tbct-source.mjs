import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const transcriptPath = process.argv[2];

if (!transcriptPath) {
  throw new Error("Usage: node artifacts/extract-tbct-source.mjs <transcript.jsonl>");
}

const beginMarker = "===== BEGIN TBCT SOURCE TEXT =====";
const endMarker = "===== END TBCT SOURCE TEXT =====";
const transcript = readFileSync(transcriptPath, "utf8");
const records = transcript.split(/\r?\n/).flatMap((line) => {
  try {
    return [JSON.parse(line)];
  } catch {
    return [];
  }
});
const sourceMessages = records.filter((record) =>
  record.type === "user.message"
  && typeof record.data?.content === "string"
  && record.data.content.includes(beginMarker),
);
const sourceMessage = sourceMessages.at(-1)?.data.content;

if (!sourceMessage) {
  throw new Error("No marker-bounded TBCT source message was found.");
}

const beginIndex = sourceMessage.indexOf(beginMarker);
const endIndex = sourceMessage.indexOf(endMarker, beginIndex + beginMarker.length);

if (beginIndex < 0 || endIndex < 0) {
  throw new Error("The marker-bounded TBCT source is incomplete.");
}

const source = sourceMessage.slice(beginIndex + beginMarker.length, endIndex);
const sourceLines = source.split(/\r?\n/);
const sessionHeadingPattern = /^Session 0([1-8]) [–-] (.+?)\r?$/gm;
const sessionHeadings = [...source.matchAll(sessionHeadingPattern)];

if (sessionHeadings.length !== 8) {
  throw new Error(`Expected Session 01–08 headings exactly once; found ${sessionHeadings.length}.`);
}

const hash = (value) => createHash("sha256").update(value, "utf8").digest("hex");
const lineAt = (offset) => source.slice(0, offset).split(/\r?\n/).length;
const sessionManifest = sessionHeadings.map((heading, index) => {
  const nextHeading = sessionHeadings[index + 1];
  const endOffset = nextHeading?.index ?? source.length;

  return {
    sourceSession: `Session ${heading[1].padStart(2, "0")}`,
    sourceSection: "Complete session source",
    title: heading[2],
    sourceLineStart: lineAt(heading.index),
    sourceLineEnd: nextHeading ? lineAt(endOffset) - 1 : sourceLines.length,
    sourceTextHash: hash(source.slice(heading.index, endOffset)),
  };
});

const manifest = {
  beginMarkerFound: beginIndex === 0,
  endMarkerFound: endIndex >= 0,
  sourceCharacterCount: [...source].length,
  sourceUtf8ByteCount: Buffer.byteLength(source, "utf8"),
  sourceLineCount: sourceLines.length,
  sourceTextHash: hash(source),
  sessions: sessionManifest,
};

const artifactDirectory = resolve("artifacts");
mkdirSync(artifactDirectory, { recursive: true });
writeFileSync(resolve(artifactDirectory, "tbct-source-text.txt"), source, "utf8");
writeFileSync(resolve(artifactDirectory, "tbct-source-ingestion.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify(manifest, null, 2));