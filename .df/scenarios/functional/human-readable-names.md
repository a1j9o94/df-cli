---
name: human-readable-names
type: functional
spec_id: run_01KJT1DSECDSZP9V2JPPS48CRC
created_by: agt_01KJT1DSEEGBAKZSDD5AYGA6XR
---

SCENARIO: No raw ULIDs, timestamps-as-names, or snake_case IDs in default view.

PRECONDITIONS:
- Database has runs with agents named like 'architect-1772394582557' and 'builder-mod_data_layer'
- Run IDs are ULIDs like 'run_01KJNF64GVR4...'
- Dashboard server is running

TEST STEPS:
1. Fetch GET / (HTML dashboard)
2. Inspect JavaScript rendering functions for run cards, run header, agents, modules
3. Verify run header shows specTitle (human text) not raw specId
4. Verify agent names are transformed to human-readable format (e.g. 'Builder: data-layer' instead of 'builder-mod_data_layer')
5. Verify phase names use friendly labels (e.g. 'Evaluating' not 'evaluate-functional')
6. Verify timestamps are shown as relative time ('3m ago') not ISO format ('2026-03-01T19:02:20Z')
7. Verify run IDs in sidebar use spec title as primary, not raw ULID

EXPECTED RESULTS:
- Agent display names use 'Role: module-title' format or similar human-friendly pattern
- Phase labels use PHASE_LABELS mapping
- Timestamps shown as relative time in default view
- Spec titles shown instead of spec IDs
- No raw ULIDs visible as primary text (may be in tooltips or secondary text)

PASS CRITERIA:
- The renderRunHeader function uses specTitle
- Agent name rendering transforms raw names to friendly format
- Timestamps use relative format (e.g. computeElapsed or 'Xm ago')
- No raw ULID/snake_case ID is the primary displayed text in any card