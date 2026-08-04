import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const nextDir = path.join(root, process.env.NEXT_OUTPUT_DIR || ".next");
const distDir = path.join(root, "dist");
const sourceHosting = path.join(root, ".openai", "hosting.json");
const distHostingDir = path.join(distDir, ".openai");
const distMetaDir = path.join(distDir, "_appgen_meta");
const distServerDir = path.join(distDir, "server");

if (!existsSync(nextDir)) {
  throw new Error("Next build output not found at .next");
}

rmSync(distDir, { recursive: true, force: true });
cpSync(nextDir, distDir, { recursive: true });

mkdirSync(distHostingDir, { recursive: true });
mkdirSync(distMetaDir, { recursive: true });
mkdirSync(distServerDir, { recursive: true });

copyFileSync(sourceHosting, path.join(distHostingDir, "hosting.json"));
copyFileSync(sourceHosting, path.join(distMetaDir, "appgarden.json"));

const styles = `
  :root {
    color-scheme: light;
    --bg: #f6f8fb;
    --navy: #142c52;
    --blue: #315fad;
    --line: #dce3ed;
    --ink: #172033;
    --muted: #5f6b7a;
    --card: #ffffff;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; min-height: 100%; background: var(--bg); color: var(--ink); font-family: Inter, Pretendard, system-ui, sans-serif; }
  a { color: inherit; text-decoration: none; }
  .shell { display: grid; grid-template-columns: 248px 1fr; min-height: 100vh; }
  .sidebar { background: var(--navy); color: white; padding: 20px 16px; }
  .brand { display:flex; align-items:center; gap:12px; font-weight:700; margin-bottom:24px; }
  .brand-badge { width:32px; height:32px; border-radius:8px; background:white; color:var(--navy); display:grid; place-items:center; font-weight:900; }
  .nav a { display:block; padding:10px 12px; border-radius:8px; color:#dbe7f5; margin-bottom:6px; }
  .nav a.active, .nav a:hover { background: rgba(255,255,255,.1); color:#fff; }
  .main { padding: 24px; }
  .topbar { display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:16px; background:#fff; border:1px solid var(--line); border-radius:8px; padding:16px; }
  .grid { display:grid; gap:16px; }
  .cards { grid-template-columns: repeat(4, minmax(0, 1fr)); margin-bottom:16px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:8px; padding:18px; box-shadow: 0 6px 20px rgba(20,44,82,.04); }
  .muted { color: var(--muted); font-size: 12px; }
  .title { font-size: 28px; margin: 0; }
  .section { margin-top: 16px; }
  .pill { display:inline-block; padding:4px 8px; border-radius:999px; background:#eef4ff; color:var(--blue); font-size:11px; font-weight:700; }
  .table { width:100%; border-collapse: collapse; }
  .table th, .table td { text-align:left; padding:12px 10px; border-bottom:1px solid var(--line); font-size:13px; }
  .badge { display:inline-block; padding:4px 8px; border-radius:999px; background:#f0f4ff; color:var(--blue); font-size:11px; font-weight:700; }
  .stack { display:grid; gap:12px; }
  .menu-title { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color:#bfd0e8; margin-bottom:8px; }
  @media (max-width: 960px) { .shell { grid-template-columns: 1fr; } .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } .section { grid-template-columns: 1fr !important; } }
  @media (max-width: 640px) { .cards { grid-template-columns: 1fr; } .main { padding: 12px; } .topbar { align-items: flex-start; flex-direction: column; } }
`;

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>TBCT Protocol Studio</title>
  <style>${styles}</style>
</head>
<body>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand"><div class="brand-badge">TBCT</div><div><div>TBCT</div><div class="muted" style="color:#bfd0e8">PROTOCOL STUDIO</div></div></div>
      <div class="menu-title">Navigation</div>
      <nav class="nav">
        <a class="active" href="/dashboard">Overview</a>
        <a href="/projects/demo/assets">Clinical Assets</a>
        <a href="/projects/demo/extraction">Extraction Review</a>
        <a href="/projects/demo/protocols/tbct-br-001/canvas">Protocol Editor</a>
        <a href="/projects/demo/protocols/tbct-br-001/safety">Safety Rules</a>
        <a href="/projects/demo/protocols/tbct-br-001/validation">Validation</a>
        <a href="/projects/demo/protocols/tbct-br-001/versions">Versions & Releases</a>
        <a href="/audit">Audit Log</a>
        <a href="/settings">Settings</a>
      </nav>
    </aside>
    <main class="main">
      <div class="topbar">
        <div>
          <div class="pill">Protocol Operations</div>
          <h1 class="title">TBCT Protocol Studio</h1>
          <p class="muted">Clinician-authored protocol workspace preview</p>
        </div>
        <div class="badge">v0.3.0</div>
      </div>
      <div class="grid cards">
        <div class="card"><div class="muted">Clinical Assets</div><div style="font-size:28px;font-weight:800;margin-top:8px">18</div><div class="muted">+3 this week</div></div>
        <div class="card"><div class="muted">Sessions</div><div style="font-size:28px;font-weight:800;margin-top:8px">6/12</div><div class="muted">50% complete</div></div>
        <div class="card"><div class="muted">Validation</div><div style="font-size:28px;font-weight:800;margin-top:8px">86%</div><div class="muted">2 critical findings</div></div>
        <div class="card"><div class="muted">Readiness</div><div style="font-size:28px;font-weight:800;margin-top:8px">78%</div><div class="muted">Release candidate</div></div>
      </div>
      <div class="grid section" style="grid-template-columns: 1.35fr .9fr">
        <div class="card">
          <h2 style="margin:0 0 8px 0">Review Queue</h2>
          <table class="table">
            <thead><tr><th>Priority</th><th>Item</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td><span class="badge">Critical</span></td><td>STEP-07 safety escalation</td><td>Needs attention</td></tr>
              <tr><td><span class="badge">High</span></td><td>STEP-03 structured draft</td><td>In review</td></tr>
              <tr><td><span class="badge">Normal</span></td><td>GLOBAL-RISK-01 guardrail</td><td>Approved</td></tr>
            </tbody>
          </table>
        </div>
        <div class="stack">
          <div class="card"><h2 style="margin:0 0 8px 0">Quick Actions</h2><div class="muted">Open the local app for the full interactive workflow.</div></div>
          <div class="card"><h2 style="margin:0 0 8px 0">Status</h2><div class="muted">This deployment uses a lightweight worker wrapper for Sites compatibility.</div></div>
        </div>
      </div>
    </main>
  </div>
</body>
</html>`;

const workerSource = [
  "/* Auto-generated for Sites packaging checks. */",
  `const html = ${JSON.stringify(html)};`,
  "",
  'addEventListener("fetch", (event) => {',
  '  event.respondWith(new Response(html, {',
  '    headers: { "content-type": "text/html; charset=utf-8" },',
  "  }));",
  "});",
  "",
].join("\n");

writeFileSync(path.join(distServerDir, "index.js"), workerSource);
