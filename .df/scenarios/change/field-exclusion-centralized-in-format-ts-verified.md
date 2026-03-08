---
name: field-exclusion-centralized-in-format-ts-verified
type: change
spec_id: run_01KK7SEAH0J838RH3SWCBR48SQ
created_by: agt_01KK7XF6W0MA66MHHBCJ5JS3RM
---

VERIFIED FACT: AGENT_DEFAULT_EXCLUDED_FIELDS is defined ONCE in src/utils/format.ts (line 14, value: ['system_prompt']). It is imported by exactly 3 consumer files: commands/agent/list.ts, commands/agent/show.ts, commands/status.ts. Adding a new excluded field requires changing ONLY format.ts (1 file, 1 array entry). format.ts also exports stripFields() for recursive field removal. Scenarios claiming no field exclusion mechanism exists, or that exclusion is per-command, are WRONG. PASS: Single definition in format.ts with 3 imports. FAIL: Multiple definitions or no centralized exclusion.