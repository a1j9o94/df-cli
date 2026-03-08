---
id: spec_01KJRK8CRMSZ8P2HPES7QSSJFJ
title: "Merger agent resolves conflicts: sequential merge with agent-driven conflict resolution"
type: bug
status: completed
version: 0.1.0
priority: critical
---

# Merger Agent Resolves Conflicts

## Problem

When two parallel builders modify the same file (e.g. `dashboard/server.ts`), the automated rebase-merge in `rebase-merge.ts` fails on the second branch because the first merge changed the file on main. The current code gives up on any rebase conflict. This happens on nearly every multi-module build where modules share files.

The merger AGENT exists but is only spawned for post-merge validation — it never sees the actual conflicts.

## Goal

Instead of the automated code failing on conflicts, give the merger agent the conflict to resolve. The flow becomes:

1. Try automated rebase-merge for each branch sequentially
2. If a branch has conflicts, DON'T fail — write the conflict markers to disk
3. Spawn the merger agent with the conflicted files and ask it to resolve
4. Agent reads the conflict markers, understands both sides, resolves the merge
5. Agent commits the resolution and continues

## Requirements

### Module 1: Conflict detection and handoff (`src/pipeline/merge-phase.ts`)
Change the merge phase flow:

1. Attempt `git merge --no-commit` for each branch sequentially (not rebase — merge handles 3-way better)
2. If merge succeeds cleanly: commit and move to next branch
3. If merge has conflicts:
   - List the conflicted files (`git diff --name-only --diff-filter=U`)
   - Read the conflict content from each file
   - Spawn the merger agent with a prompt that includes:
     - The list of conflicted files
     - The conflict content (both sides)
     - Which module each side came from
     - Instructions: "Resolve the conflicts, then `git add` the resolved files and `git commit`"
   - Wait for the agent to complete
   - Verify no conflict markers remain
   - Continue to next branch

### Module 2: Merger agent conflict prompt (`src/pipeline/instructions.ts`)
Add a conflict-resolution prompt builder:
- Input: list of conflicted files with their content, module names for each side
- Output: structured instructions telling the agent exactly what to resolve
- The agent should understand: "The left side (HEAD) is from module A which was already merged. The right side is from module B. Both changes are intentional — combine them."

### Module 3: Sequential merge order
Merge branches one at a time in dependency order (already computed by `computeMergeOrder`). After each successful merge (with or without agent resolution), the next branch rebases onto the updated main. This means each subsequent merge sees all previously merged code.

## Scenarios

### Functional

1. **Two modules, same file, auto-resolved**: Two builders both add new functions to the same file but in different locations. Verify merge succeeds automatically without needing the agent.

2. **Two modules, same file, agent-resolved**: Two builders both modify the same function. Verify the merger agent is spawned, resolves the conflict, and the merge completes.

3. **Three modules, cascading**: Module A merges clean. Module B conflicts with A's changes, agent resolves. Module C then merges against the resolved state. Verify all three end up on main.

4. **No conflict markers after merge**: After any agent-resolved merge, verify zero `<<<<<<<` markers in any tracked file.

5. **Post-merge tests pass**: After all branches merged, verify `bun test` passes.

### Changeability

1. **Switch merge strategy**: Changing from `git merge` to `git rebase` (or vice versa) should only require updating the merge command in one function, not the conflict detection or agent handoff logic.
