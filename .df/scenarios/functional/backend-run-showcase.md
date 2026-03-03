---
name: backend-run-showcase
type: functional
spec_id: run_01KJSYMVTRZA22SC742GEMEWDJ
created_by: agt_01KJSYMVTT7H090YHJERTJN6FG
---

## Backend Run Showcase

### Preconditions
- A completed run exists with spec title 'Add REST API endpoint for user profiles' (no visual keywords)
- The run has highlight events (module_created, scenario_passed, key_decision)
- No screenshots directory exists (or it is empty)
- highlights.json exists with at least 3 entries of different types

### Test Steps
1. Start the dashboard server
2. Navigate to the run detail view
3. Click the 'Output' tab
4. Verify NO screenshot gallery is shown (this is not a visual run)
5. Verify curated log highlights are displayed as a timeline or list
6. Verify each highlight shows: event type badge, description, module name (if applicable), timestamp
7. Verify module-by-module summary cards are displayed
8. Each summary card shows: module name, files created/modified, test pass count, key decisions

### Expected Output
- Output tab shows highlights timeline (not gallery)
- Highlights include module_created, scenario_passed, key_decision types
- Module summary cards with file lists and test counts

### Pass Criteria
- Output tab renders correctly for non-visual runs
- Highlights only show curated event types (no raw agent output)
- Module summaries show accurate file and test counts from buildplan/agents data