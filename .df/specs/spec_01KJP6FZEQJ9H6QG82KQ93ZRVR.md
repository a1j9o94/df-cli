---
id: spec_01KJP6FZEQJ9H6QG82KQ93ZRVR
title: "Fix post-build agent instructions: give integration testers and evaluators full context"
type: bug
status: draft
version: 0.1.0
priority: high
---

# Fix Post-Build Agent Instructions

## Problem

Integration testers and evaluators receive vague instructions like "Run integration tests across all merged modules" with no context about WHAT was built, WHERE the code is, WHAT contracts exist, or HOW to run tests. In practice, agents spend 10-15+ minutes exploring the codebase blind before they can do anything useful. Builder agents get rich context (module scope, worktree path, contracts, TDD instructions) — the post-build agents get almost nothing.

Real example of what the integration tester receives today:
```
1. Run integration tests across all merged modules
2. Verify cross-module contracts are satisfied
3. Report your results: dark agent report-result <id> --passed <true|false> --score <0.0-1.0>
4. Mark yourself complete: dark agent complete <id>
```

No module list, no worktree paths, no contracts, no test commands, no file list.

## Requirements

### Integration tester instructions must include:
- Full module list from the buildplan (id, title, description)
- Worktree paths for each completed builder (so the agent knows where code lives)
- All contracts with their content (TypeScript interfaces, API shapes, etc.)
- The dependency graph (which modules depend on which)
- The buildplan's `integration_strategy` (checkpoints, final integration test description)
- What files each builder created/modified (from git diff in worktrees)
- The project's test command (from config.yaml or package.json)
- Explicit steps: "1. Merge worktree branches, 2. Run `bun test`, 3. Verify contract X by checking Y"

### Evaluator instructions must include:
- Full scenario list with file paths (not just "load from .df/scenarios/")
- The spec content (what was requested)
- The buildplan summary (what modules were built)
- What files were created (so the evaluator knows where to look)
- The project's test/run commands
- For functional evaluation: how to start the built application if applicable
- Explicit steps: "1. Read scenario X at path Y, 2. Run test Z, 3. Score pass/fail"

### Merger instructions must include:
- Worktree paths and branch names for each completed builder
- The dependency order for merging (from buildplan DAG)
- Known conflicts between modules (if any contracts were modified)
- The target branch name
- Post-merge validation commands

### Implementation
- `sendInstructions()` in `engine.ts` already exists for each role — enrich it
- For integration tester: query the buildplan, completed builders (with worktree paths), contracts, and pass all of it in the mail body
- For evaluator: read scenario files, include spec content, builder file lists
- For merger: include worktree paths, branch names, dependency order
- The mail body should be structured markdown that the agent can parse step by step

## Scenarios

### Functional

1. **Integration tester receives module list**: Run a build with 3 modules. Verify the integration tester's mail includes all 3 module names, descriptions, and worktree paths.

2. **Integration tester receives contracts**: Verify the mail includes the full contract content (not just names) so the tester can verify implementations match.

3. **Integration tester receives file list**: Verify the mail includes what files each builder created/modified.

4. **Evaluator receives scenarios with paths**: Verify the evaluator's mail lists each scenario file with its full path, not just "load from .df/scenarios/".

5. **Evaluator receives spec content**: Verify the evaluator's mail includes the original spec so it can compare intent vs implementation.

6. **Merger receives branch names**: Verify the merger's mail includes the exact git branch name for each worktree, in dependency order.

7. **Agent completes faster with context**: Measure time for integration tester with rich vs sparse instructions. Rich context should reduce agent time by >50%.

### Changeability

1. **Add new context field**: Adding a new field to the instructions (e.g. "code coverage report") should only require adding a query and a line to the mail template. No structural changes.
