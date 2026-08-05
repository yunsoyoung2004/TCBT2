// Applies sql/*.sql migration files (in filename order) to the Neon database
// pointed at by DATABASE_URL. Safe to re-run: every statement uses
// CREATE TABLE/INDEX IF NOT EXISTS.
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Client } from "pg";

const dbUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL is not set. Run `vercel env pull .env.local` or check .env.local.");
  process.exit(1);
}

// Multi-statement raw SQL files need the full Postgres wire protocol
// (a plain TCP client), not the single-statement HTTP `neon()`
// tagged-template driver used at runtime in the API route.
const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();

const sqlDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "sql");
const files = readdirSync(sqlDir).filter((file) => file.endsWith(".sql")).sort();

try {
  for (const file of files) {
    const contents = readFileSync(path.join(sqlDir, file), "utf8");
    console.log(`Applying ${file}...`);
    await client.query(contents);
  }
  console.log(`Done. Applied ${files.length} migration file(s).`);
} finally {
  await client.end();
}
