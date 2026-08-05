# Before/after comparison

| Area | Before live evidence | Runtime after fix | New live verification |
|---|---|---|---|
| Equal ratings | S03 described 62 → 62 as meaningful movement | Prompt contract states unchanged; deterministic validator rejects contradictory change claims | Blocked by Anthropic credit |
| Duplicate messages | Repeated/near-duplicate openings and closings observed | Same-PromptItem exact/strong near-duplicates trigger one constrained repair, then source fallback | Blocked by Anthropic credit |
| Prompt identity | S03 visible content appeared shifted | Contract and trace carry release/session/node/prompt/sequence/role identity; active-step guard remains enforced | Tests pass; live blocked |
| Transitions | Provisional-looking transition appeared as final | Model recommendation, deterministic evaluation, and committed transition are separate; committed next IDs mirror repository patch | Tests pass; live blocked |
| Turn association | Some patient turns reported missing input | Stable client/patient/assistant/trace IDs and session versions; startup is `assistant_only` | Tests pass; live blocked |
| Conditional prompts | Inactive prompts appeared skipped | Explicit execution status vocabulary added; inactive conditions recorded separately from errors | Tests pass; live blocked |
| Fields | Prompt-derived `:response` keys appeared | Semantic mapping added; legacy candidate-two key normalizes to `candidateTwoPossibility`; nonsemantic response keys are not clinical fields | Tests pass; live blocked |
| Unsupported praise | Claude could affirm unsupported interpretations | Prompt contingency guidance and deterministic numeric checks added | Tests pass; live blocked |

Pre-fix transcripts: `../live-claude/s01-live.md` and `../live-claude/s03-live.md`.
