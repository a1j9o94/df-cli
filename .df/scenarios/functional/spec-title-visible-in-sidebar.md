---
name: spec-title-visible-in-sidebar
type: functional
spec_id: run_01KJNFM10CHHWZV5TVPXKE50XR
created_by: agt_01KJNFM10EV9BXZCJNZKFZEN7F
---

SETUP: Start the dashboard server with a database containing at least one run linked to a spec via spec_id. The specs table must have a row with matching id and a human-readable title (e.g. 'Redesign dashboard around the workplan'). STEPS: 1. GET /api/runs — verify response includes 'specTitle' field with the human-readable spec title string (not the spec ID). 2. GET / (HTML root) — verify the rendered HTML sidebar run cards show the spec title as primary text. Specifically: the run-card element should display the spec title prominently, NOT the raw spec_id (e.g. 'spec_01KJNE...'). 3. The spec ID should still be accessible (as a tooltip, data attribute, or small monospace text), but NOT be the headline/primary text of the run card. PASS CRITERIA: - /api/runs response objects contain specTitle field with non-empty string matching specs.title - HTML sidebar shows spec title as primary run card text - Spec IDs are not the headline of any run card