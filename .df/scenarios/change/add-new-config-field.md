---
name: add-new-config-field
type: change
spec_id: run_01KK7R4Y00QTYW313JFYCM7YTJ
created_by: agt_01KK7R4Y02HV5WA517GHC8FYHE
---

MODIFICATION: Add a new config field 'build.max_module_retries' (number, 0-5, default 2) to the settings UI. AFFECTED AREAS: 1. DfConfig type in src/types/config.ts (field already exists in type). 2. Config validator - add range check (0-5). 3. Settings tab UI in src/dashboard/index.ts - add number input field in Build Settings section. EXPECTED EFFORT: Small - add one validation rule and one form field. No API changes needed since PUT /api/config accepts partial JSON and deep-merges. No server.ts changes. Estimated: 15-30 minutes, ~20 lines changed across 2 files (validator + UI). PASS CRITERIA: New field appears in Settings tab, validates correctly, saves/loads via existing API.