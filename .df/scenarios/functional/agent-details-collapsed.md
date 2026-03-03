---
name: agent-details-collapsed
type: functional
spec_id: run_01KJT1DSECDSZP9V2JPPS48CRC
created_by: agt_01KJT1DSEEGBAKZSDD5AYGA6XR
---

SCENARIO: Agent details are collapsed by default and expandable.

PRECONDITIONS:
- Database has a run with multiple agents (architect, builders)
- Dashboard server is running

TEST STEPS:
1. Fetch GET / (HTML dashboard)
2. Verify the Overview tab does NOT show full agent details (PID, cost, tokens) by default
3. Verify there is a collapsible/expandable 'Agents' section at the bottom of the overview
4. Verify the collapsed view shows minimal info (role, status, elapsed)
5. Verify the HTML/JS supports expanding the agents section
6. When expanded, verify PID, cost, tokens, error, worktree path are available

EXPECTED RESULTS:
- Agent details (PID, per-agent cost, tokens) are NOT in the default overview view
- An 'Agents' section exists that is collapsed/hidden by default
- The section can be expanded (click handler or CSS toggle)
- Expanded state shows full agent detail: PID, cost, tokens, elapsed, error

PASS CRITERIA:
- The default overview tab rendering does NOT show agent PID/tokens as primary content
- A collapsible agents section exists with expand/collapse functionality
- Expanded agents section contains PID, cost, tokens fields