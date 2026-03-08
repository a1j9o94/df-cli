---
name: add-custom-highlight-patterns
type: change
spec_id: run_01KK7SEJD8Z1CHN7Z2B1ZDT9P9
created_by: agt_01KK7SEJD9V7MRX6KC86N28S5K
---

MODIFICATION: Allow users to define custom patterns for log extraction in .df/config.yaml.

DESCRIPTION: Users want to add custom regex patterns that the highlight extractor recognizes, beyond the built-in patterns (Decision:, Architecture:, etc.).

EXAMPLE CONFIG:
```yaml
highlights:
  custom_patterns:
    - pattern: 'Performance:'
      type: 'performance_note'
    - pattern: 'Security concern:'
      type: 'security_flag'
```

EXPECTED CHANGES:
1. Read custom patterns from .df/config.yaml in the highlight extractor.
2. Apply custom patterns alongside built-in patterns during log parsing.
3. Custom highlight types flow through the same highlights.json format.
4. No changes to: dashboard rendering (highlights already render by type), storage format, API routes.

AFFECTED AREAS:
- Highlight extraction module (src/utils/highlight-extractor.ts or equivalent) — read config, apply custom patterns
- .df/config.yaml schema — document new 'highlights.custom_patterns' section

EFFORT ESTIMATE: Low. The extractor already parses patterns; adding config-driven patterns is a small extension.

PASS CRITERIA:
- Custom patterns from config are applied during extraction.
- Dashboard renders custom highlight types without code changes (generic rendering).
- Storage format (highlights.json) unchanged — custom types use same schema.