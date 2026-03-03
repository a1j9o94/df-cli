---
name: status-display-model-name
type: functional
spec_id: run_01KJSS4T9P8HBVBAJEFGWG8ZFR
created_by: agt_01KJSS4T9S94DSTBKCA1MND95P
---

Scenario: Status display shows model name indicator from config.

SETUP:
1. Write .df/config.yaml with:
   cost:
     profile: 'opus'
   (Or cost.model: 'opus')
2. Create a run with at least one agent that has estimated (not self-reported) costs.

TEST STEPS:
1. Run 'dark status' (or invoke the status command programmatically).
2. Inspect the output line for the run. It should include the model indicator.
3. Expected format for summary line (approximate):
   run_XXXX  running  phase=build  $1.27/$20.00 (opus est.)
   The '(opus est.)' suffix must appear when costs are estimated.
4. Verify that when an agent self-reports actual costs (agent.cost_usd > 0 from --cost flag, not from estimation), the '(MODEL est.)' suffix is dropped or changed to indicate real costs.
5. With default config (no cost section), the indicator should show '(sonnet est.)' since sonnet is the default model.
6. Verify the cost display line in the detailed run view (--run-id) also shows the model indicator:
   Cost:      $1.27 / $20.00 (sonnet est.)

PASS CRITERIA:
- Model name from config.cost.model (or resolved from profile) appears in status output.
- The 'est.' suffix distinguishes estimated from actual costs.
- Default model name is 'sonnet'.
- Profile-derived model names work (opus, haiku).