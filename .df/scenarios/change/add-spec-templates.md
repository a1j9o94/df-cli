---
name: add-spec-templates
type: change
spec_id: run_01KK6BYC9GJ9F5XNE49PW7SN3S
created_by: agt_01KK6BYC9JZPT9DBGBS867HCTJ
---

Modification: Add a 'template' dropdown to the spec creation flow with options like 'API endpoint', 'UI component', 'CLI command'. Each template pre-fills the spec structure differently.

Expected changes:
1. Add a template map data structure (e.g., SPEC_TEMPLATES object with name -> markdown template pairs)
2. Add a select/dropdown element to the creation modal/panel in the UI
3. When a template is selected, pass template name to POST /api/specs along with description
4. Server-side: use template to structure the generated spec differently

Areas that should NOT change:
- The inline markdown editor component
- The save/load API contract (PUT /api/specs/:id still accepts markdown body)
- The spec file format (still YAML frontmatter + markdown)
- The sidebar listing logic
- The build flow

Expected effort: Small — adding a data structure + one UI element + one optional API parameter. No structural changes to existing code.

Pass criteria: Template feature can be added by modifying only the creation flow (modal/panel + POST handler). Editor and save/load remain untouched.