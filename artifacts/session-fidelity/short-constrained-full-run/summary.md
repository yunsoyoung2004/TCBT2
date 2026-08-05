# S01-S08 short constrained full-run audit

- Assessment provider: groq
- Patient answers: short synthetic, de-identified
- Critical-risk interruption: excluded from this completion run and should be audited separately

| Session | Constraint injection | Recovered | Inputs | Final status | Fallbacks | Repairs | Provider errors | Duplicates | Result |
|---|---|---:|---:|---|---:|---:|---:|---:|---|
| TBCT-S01 | empty_input | yes | 33 | completed | 0 | 0 | 0 | 0 | pass |
| TBCT-S02 | copied_program_question | yes | 21 | completed | 0 | 0 | 0 | 0 | pass |
| TBCT-S03 | low_effort_unknown | yes | 28 | completed | 0 | 0 | 0 | 0 | pass |
| TBCT-S04 | low_effort_acknowledgement | yes | 26 | completed | 0 | 0 | 0 | 0 | pass |
| TBCT-S05 | benign_plan_not_safety | yes | 12 | completed | 0 | 0 | 0 | 0 | pass |
| TBCT-S06 | clarification_request | yes | 20 | completed | 0 | 0 | 0 | 0 | pass |
| TBCT-S07 | minimal_non_answer | yes | 13 | completed | 0 | 0 | 0 | 0 | pass |
| TBCT-S08 | out_of_range_number | yes | 28 | completed | 0 | 0 | 0 | 0 | pass |
