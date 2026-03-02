---
id: spec_01KJP8TZ4KPQ7APXT7MFDEPRH7
title: "Builder reliability: prevent crashes when editing large existing files"
type: bug
status: draft
version: 0.1.0
priority: critical
---

# Builder Reliability

## Problem

Builders that create new files succeed reliably. Builders that need to modify large existing files (like `engine.ts` at 600+ lines) crash with "process exited without completing." This has been observed across 3 different specs, with the same modules failing repeatedly on retry:

- `worktree-isolation` (modifies `engine.ts` + `worktree.ts`) — failed 2x
- `instruction-enrichment` (modifies `engine.ts`) — failed 2x
- `json-sanitization` (modifies multiple command files) — failed 2x

Builders that create new files in the same runs complete fine: `git-commit-on-create`, `instruction-context`, `merge-lock`, `merge-queue` all succeeded.

## Root Cause Analysis

The `claude --print` process exits before the agent calls `dark agent complete`. Likely reasons:

1. **Context exhaustion**: The agent reads a large file, fills its context, then can't fit the edit + test cycle. With `engine.ts` at 600+ lines, reading it alone consumes significant context.

2. **No file pre-loading**: The builder's instructions say "modify engine.ts" but don't include the file contents. The agent wastes turns reading the file, understanding it, finding the right location — all consuming context that should be spent on the actual edit.

3. **No checkpoint/save mechanism**: If the agent makes 5 edits and crashes on the 6th, all work is lost. There's no way to commit intermediate progress.

4. **Scope too large**: The architect assigns "modify engine.ts to add X, Y, and Z" as one module. Each of X, Y, Z could be a separate, smaller edit.

## Requirements

### Fix 1: Pre-load file contents in builder instructions
When the architect's buildplan says a module modifies a file, the engine should:
1. Read that file's contents
2. Include it (or a relevant excerpt) in the builder's mail instructions
3. The builder starts with the file already in context — no wasted turns reading

For files >200 lines, include only the relevant section (based on what the module needs to modify) plus surrounding context. The architect's module scope should include line ranges or function names when possible.

### Fix 2: Builder auto-commit on each TDD cycle
After each successful TDD cycle (test passes), the builder should automatically `git commit` in the worktree. This way:
- If the process crashes, the completed work is preserved
- On retry, the new builder sees the commits and continues from where the last one left off
- The engine can report partial progress ("3/5 functions implemented")

Add to the builder prompt: "After each passing test, commit your changes: `git add -A && git commit -m 'feat: <what you just implemented>'`"

### Fix 3: Architect decomposes large file edits into smaller modules
The architect prompt should include guidance:
- If a module requires modifying a file >300 lines, consider splitting into sub-modules
- Each sub-module should touch at most 1-2 existing files
- Prefer "add a new function to file X" over "restructure file X"
- If restructuring is needed, do it in a dedicated module with no other scope

### Fix 4: Builder retry inherits worktree
When `dark continue` retries a failed builder, it should:
1. Check if the old worktree still exists
2. If it has commits from the previous attempt, reuse it instead of creating a fresh one
3. The new builder's instructions mention: "Previous attempt made these commits: [list]. Continue from here."

### Fix 5: `--output-format stream-json` for crash diagnostics
Change `claude --print` to use `--output-format stream-json` and capture the output to `.df/logs/<agent-id>.jsonl`. This gives us:
- What the agent was doing when it crashed
- Token usage and cost (real, not estimated)
- The last tool call before the crash
- Enough to diagnose whether it was context exhaustion, API error, or something else

The logs are write-only during the run and read for diagnostics after.

## Scenarios

### Functional

1. **Builder receives file contents in instructions**: Module scope says `modifies: ["src/pipeline/engine.ts"]`. Verify the builder's mail includes the file content (or relevant excerpt).

2. **Builder auto-commits after each TDD cycle**: Builder implements 3 functions with tests. Verify 3 separate git commits exist in the worktree after completion.

3. **Crash preserves partial work**: Builder makes 2 commits, then the process crashes. Verify the 2 commits survive in the worktree. Resume the build — new builder sees the commits and continues.

4. **Retry reuses worktree with commits**: Builder fails after making commits. `dark continue` retries. Verify the new builder gets the same worktree with previous commits, not a fresh worktree.

5. **Large file split by architect**: Spec requires modifying a 500-line file in 3 ways. Verify architect creates 3 sub-modules instead of 1.

6. **Agent logs captured**: Builder runs and completes. Verify `.df/logs/<agent-id>.jsonl` exists with structured output.

### Changeability

1. **Change pre-load strategy**: Switching from "include full file" to "include function-level excerpt" should only require changing the content extraction logic, not the mail delivery or prompt format.
