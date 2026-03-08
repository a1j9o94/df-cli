---
name: design-tokens-in-build
type: functional
spec_id: run_01KK7SEAJYN7NS72QQARJ3QEKA
created_by: agt_01KK7SEAJZB0HYJMAJBXMD3R8E
---

## Test: Design tokens JSON accessible to builder

### Setup
1. Initialize Dark Factory project
2. Create spec: dark spec create 'Styled component'
3. Create a design tokens JSON file with content: {"colors": {"primary": "#3B82F6", "secondary": "#10B981"}, "spacing": {"sm": "8px", "md": "16px"}, "fonts": {"heading": "Inter", "body": "system-ui"}}
4. Attach tokens file: dark spec attach <spec-id> design-tokens.json

### Steps
1. Run build for the spec
2. Check builder instructions mail body
3. Verify design tokens file path is included in builder instructions
4. Verify builder prompt includes guidance to use design token values
5. For worktree builders: verify tokens.json is copied to .df-attachments/

### Expected Output
- Builder instructions reference the design tokens file
- Builder prompt mentions using token values for colors, spacing, fonts
- Token file is readable by the builder in its worktree

### Pass/Fail Criteria
- PASS: Tokens referenced in builder mail, file accessible, prompt guidance present
- FAIL: Tokens not referenced, file not accessible, or no prompt guidance for tokens