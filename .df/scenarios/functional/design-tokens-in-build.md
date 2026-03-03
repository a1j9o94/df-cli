---
name: design-tokens-in-build
type: functional
spec_id: run_01KJT1F6EV2A1H0TKH6N55D515
created_by: agt_01KJT1F6EWZQATERS37B1QJ6TS
---

## Scenario: Design tokens file included in builder context

### Preconditions
- A Dark Factory project is initialized
- A spec exists
- A design tokens JSON file exists (e.g., tokens.json with content like: { "color": { "primary": "#3B82F6" }, "spacing": { "sm": "0.5rem" }, "font": { "base": "16px" } })

### Steps
1. Create a spec
2. Attach a design tokens JSON file: dark spec attach <spec-id> tokens.json
3. Verify the file is stored in .df/specs/attachments/<spec-id>/tokens.json
4. Verify the spec frontmatter includes tokens.json in the attachments array
5. Simulate or trigger a builder for this spec
6. Verify the builder instructions mail includes the design token content or a reference to the token file
7. Verify the evaluator context includes the design tokens file path for validation

### Expected Output
- tokens.json is stored alongside other attachments
- Builder mail includes design token values or path to the file
- JSON files with .json extension are treated as design tokens (identified by extension or content)
- Evaluator can reference the tokens to validate built CSS uses correct values

### Pass/Fail Criteria
- PASS: Design token file is attached, builder receives token context, evaluator has token reference
- FAIL: JSON file rejected, tokens not in builder mail, or evaluator unaware of tokens