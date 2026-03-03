---
name: empty-showcase-graceful
type: functional
spec_id: run_01KJSYMVTRZA22SC742GEMEWDJ
created_by: agt_01KJSYMVTT7H090YHJERTJN6FG
---

## Empty Showcase Graceful

### Preconditions
- A completed run exists where:
  - No screenshots were captured (no .df/runs/<run-id>/screenshots/ directory or empty directory)
  - No highlights were extracted (no highlights.json or empty array)
  - The spec has no visual keywords in title/goal

### Test Steps
1. Start the dashboard server
2. Navigate to the run detail view
3. Click the 'Output' tab
4. Verify the tab displays a clean empty state message
5. Verify the message text is: 'No output captured for this run.' (or similar friendly message)
6. Verify there is a hint about how screenshots are captured
7. Verify NO broken images, empty grids, or JavaScript errors
8. Check browser console for errors - should be none related to output tab

### Expected Output
- Clean empty state with informative message
- No broken UI elements
- No JS console errors

### Pass Criteria
- Output tab renders without errors
- Empty state message is human-readable and informative
- No broken image thumbnails or empty containers
- Browser console has zero errors from the output tab code