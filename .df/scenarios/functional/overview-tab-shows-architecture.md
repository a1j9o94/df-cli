---
name: overview-tab-shows-architecture
type: functional
spec_id: run_01KJNFM10CHHWZV5TVPXKE50XR
created_by: agt_01KJNFM10EV9BXZCJNZKFZEN7F
---

SETUP: Start dashboard with a database containing a completed run that has an active buildplan with at least 2 modules and 1 dependency edge (e.g. mod-A depends on mod-B). The buildplan should also have at least 1 risk entry. STEPS: 1. GET / (HTML) and select the completed run. 2. Verify the default tab is 'Overview' (not 'Agents' as currently). 3. On the Overview tab, verify: a) Spec goal text is displayed (first paragraph from the spec file). b) Module names and one-line descriptions are visible. c) A dependency visualization exists showing the flow between modules (e.g. 'data-layer → code-gen → http-api'). d) Risks from the buildplan are displayed. 4. GET /api/runs/:id/buildplan — verify response includes modules with title/description, dependencies array, and risks array. PASS CRITERIA: - Overview is the default active tab - Module names + descriptions visible in overview - Dependency flow visualization present - Risks section visible when buildplan has risks - Spec goal paragraph displayed