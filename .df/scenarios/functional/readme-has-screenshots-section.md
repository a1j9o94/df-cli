---
name: readme-has-screenshots-section
type: functional
spec_id: run_01KK7DP798CHYWTWAKHGK0A2C7
created_by: agt_01KK7DP799F4SZXE3CDAY0ZRQP
---

## Test: README has screenshots section with valid image references

### Preconditions
- Build is complete
- README.md exists in project root

### Steps
1. Read README.md
2. Verify it contains a section titled 'Screenshots' or 'What it looks like' (case-insensitive heading search)
3. Verify this section appears AFTER the 'How It Works' section and BEFORE the 'Agent Roles' section
4. Extract all image references (markdown image syntax: ![alt](path)) from the screenshots section
5. For each image reference, verify the path points to docs/screenshots/*.png
6. For each referenced file, verify it exists on disk and is a valid PNG (file size > 0 bytes)
7. Verify at least 4 distinct screenshots are referenced (spec requires 6 dashboard/terminal states)
8. Verify each image has non-empty alt text (accessibility requirement)

### Expected Results
- Screenshots section exists between 'How It Works' and 'Agent Roles'
- All referenced PNG files exist in docs/screenshots/
- At least 4 screenshots referenced
- All images have descriptive alt text (not empty, not generic like 'screenshot')

### Pass Criteria
- All referenced image files exist and are non-zero size
- Section is correctly positioned in README
- Alt text is descriptive (>10 characters each)