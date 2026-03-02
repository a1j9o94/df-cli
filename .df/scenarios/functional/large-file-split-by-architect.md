---
name: large-file-split-by-architect
type: functional
spec_id: run_01KJP8WZ5DKH52F4S0SWCGKJWW
created_by: agt_01KJP8WZ5FJ90GR22QSDS2FYR3
---

## Scenario: Large file split by architect into sub-modules

### Preconditions
- A spec exists that requires modifying a single file in 3 distinct ways
- The file is >300 lines (e.g., engine.ts at 1136 lines)
- The architect agent processes this spec

### Test Steps
1. Check the architect prompt template (src/agents/prompts/architect.ts) for large-file decomposition guidance
2. Verify the guidance includes:
   - If a module requires modifying a file >300 lines, consider splitting into sub-modules
   - Each sub-module should touch at most 1-2 existing files
   - Prefer 'add a new function to file X' over 'restructure file X'
   - If restructuring is needed, do it in a dedicated module with no other scope
3. Run or simulate an architect decomposing a spec with 3 changes to a 500-line file
4. Inspect the resulting buildplan

### Expected Output
- The architect prompt includes explicit guidance about file size thresholds and module splitting
- The buildplan contains 3 separate modules (not 1) for the 3 changes to the large file
- Each module has a focused scope (1-2 files max in modifies)
- Dependencies are set so they run sequentially (same file, can cause merge conflicts)

### Pass/Fail Criteria
- PASS: Architect prompt contains large-file guidance AND buildplan splits large-file changes into sub-modules
- FAIL: Architect prompt lacks guidance, OR buildplan puts all changes to a 500-line file into a single module