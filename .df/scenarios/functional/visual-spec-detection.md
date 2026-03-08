---
name: visual-spec-detection
type: functional
spec_id: run_01KK7SEJD8Z1CHN7Z2B1ZDT9P9
created_by: agt_01KK7SEJD9V7MRX6KC86N28S5K
---

PRECONDITIONS: Multiple specs exist with varying titles.

STEPS:
1. Create a spec with title 'Build a dashboard UI for metrics' — verify it is detected as visual (contains 'dashboard' and 'UI').
2. Create a spec with title 'Add JWT authentication middleware' — verify it is NOT detected as visual.
3. Create a spec with title 'Redesign the login page layout' — verify it IS detected as visual (contains 'page' and 'layout').
4. Create a spec with goal containing 'Create a widget for displaying charts' — verify it IS detected as visual (contains 'widget').
5. Create a spec with title 'UPDATE Frontend Components' — verify it IS detected as visual (contains 'frontend', case-insensitive).
6. Create a spec with title 'Fix database view migration' — verify case-insensitive 'view' IS detected as visual.

EXPECTED:
- Visual keywords: UI, frontend, dashboard, page, component, layout, design, screen, widget, view (case-insensitive).
- Detection checks both spec title AND goal text.
- Case-insensitive matching.

PASS CRITERIA:
- isVisualSpec() or equivalent function returns true for specs 1, 3, 4, 5, 6.
- Returns false for spec 2.
- Keywords matched case-insensitively.