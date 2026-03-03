---
name: add-spec-templates
type: change
spec_id: run_01KJT1DSG8KTH91RNPN25VTA7Q
created_by: agt_01KJT1DSG9535H9MNFRT5150J0
---

Changeability test: Adding a 'template' dropdown to the spec creation flow.

MODIFICATION DESCRIPTION:
Add a dropdown to the 'New Spec' creation modal that lets users pick a template (e.g., 'API endpoint', 'UI component', 'CLI command'). Each template pre-fills the spec with template-specific sections.

EXPECTED CHANGE SCOPE:
1. Add a template map (e.g., Record<string, string> mapping template names to markdown bodies)
   - This should be a single new data structure, possibly in the description generator module
2. Add a <select> element to the creation modal/panel UI
   - This should be a small addition to the creation form HTML
3. Pass the selected template to the spec generation function
   - The generation function signature may need a new optional parameter

AREAS THAT SHOULD NOT CHANGE:
- The inline markdown editor logic (save, auto-save, preview)
- The spec list sidebar
- The API endpoints (POST /api/specs can accept an optional template field, but the endpoint itself should not require restructuring)
- The immutability guard logic
- The build trigger mechanism

EXPECTED EFFORT:
- Template map: ~20-30 lines of new code
- UI dropdown: ~10-15 lines of HTML/JS
- Generator modification: ~5-10 lines to handle template parameter
- Total: <60 lines of changes across 2-3 files

PASS CRITERIA:
- Can be implemented by modifying at most 3 files
- No changes required to editor, save/load, or build logic
- Template map is a simple data structure (no complex inheritance or factory pattern needed)