---
name: add-custom-highlight-patterns
type: change
spec_id: run_01KK7R4Y1NWJRH426C68FK58CZ
created_by: agt_01KK7R4Y1TEX0SQCM76106T1F2
---

Modification: Allow users to define custom patterns for log extraction in .df/config.yaml, extending the default highlight patterns.

Expected changes:
1. Read custom patterns from .df/config.yaml (e.g., highlights.custom_patterns: [{pattern: 'Migration:', type: 'migration'}])
2. Modify the highlights extraction function to accept additional patterns from config
3. The extraction function merges default patterns with user-defined ones

Areas that should NOT need changes:
- Dashboard rendering of highlights (already renders by type with badges — new types get a default badge)
- highlights.json storage format (same structure, just new type values)
- API endpoints (same response format)
- CLI export (reads highlights.json generically)
- Screenshot capture or manifest logic

Expected effort: Small. 1-2 files modified. The highlight extractor reads patterns, the config reader loads them. Dashboard already handles arbitrary types.

Pass criteria: Custom highlight patterns can be added by modifying only the highlight extraction function and adding config file reading — no changes to dashboard rendering, storage format, or API contracts.