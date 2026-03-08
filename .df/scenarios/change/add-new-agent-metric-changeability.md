---
name: add-new-agent-metric-changeability
type: change
spec_id: run_01KK6QXFCV1988195YMPGM2QCS
created_by: agt_01KK6QXFCW27WCTXH47YAQPC0D
---

MODIFICATION: Add a new metric 'memory_usage_mb' to the agent list output.

STEPS TO IMPLEMENT:
1. Add column to agents table (or compute dynamically)
2. Add to the agent list display format string in list.ts
3. Add to agent show display in show.ts

EXPECTED EFFORT: 
- Touch only 2-3 files: list.ts display, show.ts display, and optionally agents.ts query
- No structural changes to command framework, DB layer, or formatting utilities
- formatFilesChanged pattern can be followed for new formatMemoryUsage helper
- Should be < 30 lines of code total

AFFECTED AREAS:
- src/commands/agent/list.ts (display format)
- src/commands/agent/show.ts (detail display)
- src/utils/format.ts (optional: new formatter)
- src/db/queries/agents.ts (only if column needs adding)

PASS CRITERIA:
- Adding the metric requires NO changes to: command registration, DB connection, CLI framework, existing formatting infrastructure
- The change follows the same pattern as existing metrics (elapsed, cost, files)