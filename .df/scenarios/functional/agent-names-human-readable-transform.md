---
name: agent-names-human-readable-transform
type: functional
spec_id: run_01KJT1DSECDSZP9V2JPPS48CRC
created_by: agt_01KJT41Z883KW29HZKC65GKRCB
---

SCENARIO: Agent names are transformed to human-readable format like 'Builder: data-layer'. PRECONDITIONS: Agents have raw names like 'architect-1772394582557' or 'builder-mod_data_layer'. TEST STEPS: 1. The agent rendering code should transform raw agent names to human-readable format. 2. Look for a humanReadableAgentName() or similar transform function. 3. Expected transforms: 'architect-1772394582557' -> 'Architect', 'builder-mod_data_layer' -> 'Builder: data-layer'. 4. The agent card should display the transformed name, not the raw name. 5. Raw names should be available as tooltip or secondary text. EXPECTED: Agent display names use 'Role: module-title' format. PASS CRITERIA: A name transform function exists that converts raw agent names to friendly format, and agent cards use the transformed name as primary display.