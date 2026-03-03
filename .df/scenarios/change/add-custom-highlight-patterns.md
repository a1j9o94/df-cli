---
name: add-custom-highlight-patterns
type: change
spec_id: run_01KJSYMVTRZA22SC742GEMEWDJ
created_by: agt_01KJSYMVTT7H090YHJERTJN6FG
---

## Add Custom Highlight Patterns

### Modification Description
Allow users to define custom patterns for log extraction in .df/config.yaml. For example, a user might want to extract lines matching 'Performance:' or 'Security:' in addition to the default patterns.

### Expected Changes
1. Read custom patterns from .df/config.yaml under a new 'highlight_patterns' key
2. Modify the highlight extractor to merge custom patterns with built-in patterns
3. Custom patterns would follow the same format: { pattern: string, type: string, description_template: string }

### Areas That Should NOT Change
- Dashboard rendering (it already renders based on highlight type — new types render the same way)
- Storage format (highlights.json keeps the same schema, just more event types)
- API endpoints (no changes needed — they serve whatever is in highlights.json)
- CLI export (it reads highlights.json generically)
- Screenshot capture (completely unrelated)

### Expected Effort
- Config reading: ~15 lines (add highlight_patterns to config parser)
- Pattern merging in extractor: ~10 lines (concat custom patterns with defaults)
- Type validation: ~5 lines (ensure custom types dont conflict with built-in types)
- Total: ~30 lines in 2 files (config.ts and highlight-extraction.ts)

### Pass Criteria
- Adding custom patterns requires changes to ONLY the config parser and highlight extractor
- Dashboard, API, CLI export, and screenshot modules are completely unaffected
- The highlight-extraction module has a clear pattern list that is extensible