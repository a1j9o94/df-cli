---
name: duplicate-url-detection-deduplication
type: functional
spec_id: run_01KJT1F6B8P7286PNQFFEBC6YK
created_by: agt_01KJT3KC462DV5CQBFGBE4B3PQ
---

## Scenario: Duplicate URL detection deduplication

### Steps
1. Create a spec with the same YouTube URL appearing 3 times in different sections
2. Run detectVideoUrls on the spec content
3. Verify the URL appears only ONCE in the result (deduplicated)
4. Verify buildVideoReferencesSection only suggests the command once

### Pass/Fail Criteria
- PASS: Duplicate URLs are deduplicated in both detection and section builder
- FAIL: Same URL appears multiple times in the suggestions