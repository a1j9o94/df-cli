---
name: unstructured-issue-body
type: functional
spec_id: run_01KJSS4TD4WH5VKGWK6YWSWJZQ
created_by: agt_01KJSS4TD5H3A6M3NHC0H95JFZ
---

Setup: GitHub issue with plain text body containing no markdown headers, no checkboxes, no numbered lists. Body is: 'The search feature is slow when there are more than 10,000 results. We need to add pagination or virtual scrolling to improve performance. Users have reported waiting 5+ seconds for results to render.'\n\nSteps:\n1. Run: dark spec create --from-github https://github.com/org/repo/issues/999\n2. Read the generated spec file\n3. Verify:\n   a. ## Goal section contains the entire body text\n   b. ## Requirements section exists but contains a placeholder (e.g., 'TODO: Add requirements' or similar placeholder text)\n   c. ## Scenarios section exists but contains a placeholder\n4. Verify stdout summary indicates 0 requirements extracted and 0 scenarios extracted\n\nPass criteria: Unstructured body goes entirely into Goal section. Requirements and Scenarios sections exist as placeholders. No parsing errors.