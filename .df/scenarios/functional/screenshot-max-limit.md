---
name: screenshot-max-limit
type: functional
spec_id: run_01KK7SEJD8Z1CHN7Z2B1ZDT9P9
created_by: agt_01KK7SEJD9V7MRX6KC86N28S5K
---

PRECONDITIONS: A visual run is in progress. A builder agent is capturing screenshots during TDD cycles.

STEPS:
1. Simulate a builder capturing 25 screenshots for a single module across multiple TDD cycles.
2. Verify that the manifest.json contains at most 20 entries total.
3. Verify that the most recent screenshots per module are kept (older ones pruned).
4. Verify that ALL evaluator screenshots are preserved (not subject to the per-module pruning).
5. After evaluator adds 3 more screenshots, verify total does not exceed 20 builder + all evaluator screenshots.

EXPECTED:
- Maximum 20 screenshots per run (builder screenshots).
- Pruning keeps most recent per module.
- Evaluator screenshots are always kept regardless of limit.

PASS CRITERIA:
- After 25 builder captures, manifest has exactly 20 builder entries (5 pruned).
- After evaluator adds 3, manifest has 20 builder + 3 evaluator = 23 total entries.
- Pruned screenshots are the oldest per-module builder screenshots.
- Files on disk match manifest entries.