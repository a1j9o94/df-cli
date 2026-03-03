---
name: visual-run-showcase
type: functional
spec_id: run_01KJSYMVTRZA22SC742GEMEWDJ
created_by: agt_01KJSYMVTT7H090YHJERTJN6FG
---

## Visual Run Showcase

### Preconditions
- A completed run exists with spec title containing 'dashboard UI'
- The run has at least one builder agent that completed
- Screenshots directory exists at .df/runs/<run-id>/screenshots/ with at least one build screenshot and one eval screenshot
- manifest.json exists with valid entries

### Test Steps
1. Start the dashboard server: dark dash
2. Navigate to the run detail view for the completed visual run
3. Verify an 'Output' tab appears in the tab bar alongside 'Agents' and 'Modules'
4. Click the 'Output' tab
5. Verify a screenshot gallery is displayed with thumbnail images
6. Verify each thumbnail shows: caption text, phase badge ('Build' or 'Eval'), module name, timestamp
7. Verify build screenshots appear before evaluator screenshots (chronological order)
8. Verify the API endpoint GET /api/runs/<run-id>/screenshots returns valid JSON array of ScreenshotEntry objects

### Expected Output
- Output tab is visible and clickable
- Gallery grid shows thumbnails with metadata
- Phase badges distinguish build vs eval screenshots
- Screenshots are ordered chronologically

### Pass Criteria
- Output tab renders without JS errors
- Gallery shows all screenshots from manifest.json
- Each screenshot entry has filename, phase, module, caption, timestamp fields