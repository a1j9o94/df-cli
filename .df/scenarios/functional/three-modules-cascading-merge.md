---
name: three-modules-cascading-merge
type: functional
spec_id: run_01KJRKACB26XMX8A0GG81GBA6N
created_by: agt_01KJRKACB4M7MSFDSCEN1VJ9T4
---

Three modules merge sequentially. Module A merges clean. Module B conflicts with A's changes and is resolved by the agent. Module C then merges against the resolved state (A+B) and succeeds. All three end up on main.

SETUP:
1. Create a git repo with initial commit containing:
   - src/server.ts: export function startServer() { return listen(3000); }
   - src/routes.ts: export function getRoutes() { return ['/api/health']; }
   - src/utils.ts: export function formatDate(d: Date) { return d.toISOString(); }

2. Module A (branch builder-mod-a): Modifies src/server.ts
   export function startServer() { return listen(8080); } // Changed port

3. Module B (branch builder-mod-b): Also modifies src/server.ts AND src/routes.ts
   export function startServer() { return listen(9090); } // Different port — conflicts with A
   // In routes.ts (non-conflicting):
   export function getRoutes() { return ['/api/health', '/api/users']; }

4. Module C (branch builder-mod-c): Modifies only src/utils.ts (no overlap)
   export function formatDate(d: Date) { return d.toLocaleDateString(); }

EXECUTION:
1. Merge in dependency order: A first, B second, C third
2. A merges cleanly into main
3. B conflicts with A on src/server.ts (same line, different port values)
   - Agent spawned, resolves conflict (combining both intents)
   - Agent commits resolution
   - No conflict markers remain
4. C merges against the state after A+B resolution — should be clean (only touches utils.ts)

EXPECTED:
- A: merged cleanly, no agent needed
- B: conflict detected on src/server.ts, agent spawned, conflict resolved
- C: merged cleanly against resolved A+B state
- All three branches end up on main
- No conflict markers in any file
- src/routes.ts has the new /api/users route (from B, non-conflicting)
- src/utils.ts has toLocaleDateString (from C)

PASS CRITERIA:
- executeMergePhase completes without error
- All three branches present in merged results
- Zero failed branches
- scanConflictMarkers() returns { found: false }
- All source files contain their respective changes