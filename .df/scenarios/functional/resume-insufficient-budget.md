---
name: resume-insufficient-budget
type: functional
spec_id: run_01KK6J195CBPQR35EVQ13YJ2J1
created_by: agt_01KK6J195DC0DXB8P1GAVSK9J8
---

SETUP: A run paused at cost_usd=14.87, budget_usd=15.00. STEPS: 1. Run 'dark continue <run-id> --budget-usd 14'. EXPECTED: (a) Command rejects with error message containing: 'New budget ($14) must exceed current spend ($14.87)'. (b) Run status remains 'paused' — no state change. (c) No SIGCONT sent to agents. (d) Exit code is non-zero. PASS CRITERIA: Clear rejection, no state mutation on invalid budget.