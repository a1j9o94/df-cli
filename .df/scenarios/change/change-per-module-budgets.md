---
name: change-per-module-budgets
type: change
spec_id: run_01KK6J195CBPQR35EVQ13YJ2J1
created_by: agt_01KK6J195DC0DXB8P1GAVSK9J8
---

MODIFICATION: Add per-module budget limits (in addition to per-run budgets). EXPECTED CHANGES: 1. Add a budget_usd field to the module record in buildplans (schema change). 2. Add a budget check in the builder agent or build phase handler — when a module's cost exceeds its budget, pause that module's agent specifically. 3. The existing pause/resume infrastructure (SIGTSTP/SIGCONT, state preservation, dark continue) should be reusable without modification. AFFECTED AREAS: buildplans schema (add field), build phase logic (add per-module check). NOT affected: pause sequence, resume logic, dashboard (shows module cost already), CLI commands. PASS CRITERIA: Pause infrastructure is generic enough that per-module budgets only require adding a budget field and a check — no changes to signal handling, state preservation, or resume logic.