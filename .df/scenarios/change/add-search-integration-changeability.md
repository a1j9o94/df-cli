---
name: add-search-integration-changeability
type: change
spec_id: run_01KJSS7KKA4VATPRQN2J08E2ZX
created_by: agt_01KJSS7KKB53MFBSPK7CK20AE0
---

## Changeability Scenario: Add search integration

### Modification Description
Add a new command: dark research search <query> that wraps WebSearch and auto-saves results via dark research add. This should be a thin wrapper — it calls WebSearch, formats results, and calls the existing dark research add logic internally.

### Affected Areas
- New file: src/commands/research/search.ts (new command)
- Modified file: src/commands/research/index.ts (register new subcommand)

### What Should NOT Change
- src/db/schema.ts — no schema changes needed
- src/db/queries/research.ts — no query changes needed
- src/types/research.ts — no type changes needed
- .df/research/ storage format — unchanged

### Expected Effort
- 1 new file (~40-60 lines)
- 1 small modification (1-2 lines to register subcommand in index.ts)
- No migration or storage changes

### Pass/Fail Criteria
- PASS: The search command can be added by creating ONE new command file and adding ONE import+addCommand line to the research index.ts. No changes to storage layer, DB schema, or types are required.
- FAIL: Adding search requires modifying the DB schema, changing the storage format, or restructuring existing research command files.