---
name: add-spec-templates
type: change
spec_id: run_01KK6D0A338WWPKA9YNGG3S1WB
created_by: agt_01KK6D0A34XA7984X9D1YCNN6W
---

CHANGEABILITY SCENARIO: Add spec templates to creation flow
MODIFICATION: Add a 'template' dropdown to the spec creation flow with options like 'API endpoint', 'UI component', 'CLI command'. Each template pre-fills the spec with section-specific guidance.
AFFECTED AREAS:
- The creation modal/panel in index.ts: Add a <select> element with template options
- A template map (object/array) mapping template names to pre-fill content
- No changes needed to: spec generation logic (still takes description text), editor component, save/load API, PUT/GET /api/specs endpoints
EXPECTED EFFORT: Small — add a template map constant, add a select element to the creation form, merge template content with user description before generating spec
PASS CRITERIA: Template dropdown can be added by: (1) defining a TEMPLATE_MAP object, (2) adding a <select> to the creation form HTML, (3) passing selected template to the generation function. No changes to editor, API contract, or spec storage.