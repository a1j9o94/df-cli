# Engine Audit: Enforcement Gaps

**Date:** 2026-03-11
**Scope:** `src/pipeline/engine.ts`, `.df/config.yaml`, and all referenced pipeline modules
**Auditor:** Claude Code

---

## Finding 1: `runtime.heartbeat_interval_ms` — Config defined, never read by engine

**What the config claims:** `heartbeat_interval_ms: 30000` — implies the engine uses this value to configure or enforce agent heartbeat frequency.

**What actually happens:** This value is defined in `DfConfig` (`src/types/config.ts:62`) and in `.df/config.yaml:12`, but is **never read by the engine or any pipeline module**. A grep across `src/` shows zero usages outside the type definition and config validation. The *timeout* (`heartbeat_timeout_ms`) is used by `getStaleAgents()`, but the *interval* is purely decorative. Agents decide their own heartbeat cadence.

**Severity:** Low — Cosmetic config bloat; agents self-manage heartbeat timing. However, it misleads operators into thinking they can tune heartbeat frequency.

---

## Finding 2: `runtime.max_agent_lifetime_ms` — Config defined, never enforced

**What the config claims:** `max_agent_lifetime_ms: 2700000` (45 minutes) — implies the engine will kill agents that exceed this lifetime.

**What actually happens:** This value is defined in `DfConfig` (`src/types/config.ts:64`) and `.df/config.yaml:14`, but is **never read by any pipeline code**. The only references are the type definition and config validation (`src/utils/config-validation.ts:91`). No code compares agent creation time against this limit, and no code calls `runtime.kill()` based on lifetime.

**Severity:** Medium — An agent that hangs indefinitely (but keeps heartbeating) will never be killed. The `runtime.kill()` method exists on the `AgentRuntime` interface but is never called by the engine or build phase. The only call to `kill()` is in `src/runtime/claude-code.ts:164` (the runtime implementation itself, for cleanup), not from the orchestrator.

---

## Finding 3: `resources.max_worktrees` and `resources.max_api_slots` — Never checked before spawning

**What the config claims:** `max_worktrees: 6`, `max_api_slots: 4` — implies these are hard limits on concurrent resource usage.

**What actually happens:** These values are used *only* by `src/commands/resource/status.ts` to initialize capacity display counters via `ensureResource()`. The pipeline modules (`build-phase.ts`, `agent-lifecycle.ts`, `engine.ts`) **never call `acquireResource()` or `releaseResource()`** before spawning agents or creating worktrees. The build phase uses `config.build.max_parallel` to limit concurrency, but this is a separate value — it doesn't check the resource table. The resource system (`src/db/queries/resources.ts`) has full acquire/release logic that is never invoked by the pipeline.

**Severity:** Critical — The resource limiting system is fully implemented in the DB layer but completely disconnected from the engine. Spawning can exceed `max_worktrees` and `max_api_slots` without any check or warning.

---

## Finding 4: Heartbeat timeout — Stale agents are logged but never killed

**What the code claims:** `build-phase.ts:390-396` detects stale agents via `getStaleAgents(db, config.runtime.heartbeat_timeout_ms)` and logs a warning.

**What actually happens:** The build phase loops through stale agents and calls `log.warn()`, but **never calls `runtime.kill()`**, never marks them as failed, and never takes any corrective action. The comment on line 390 explicitly says: `// Log stale agents as warnings but don't kill them`. An agent that stops heartbeating will generate warnings indefinitely but continue consuming resources.

**Severity:** Medium — A zombie agent that stops heartbeating but whose PID is still alive will never be reclaimed. The pipeline will hang in the build loop waiting for it to complete or its PID to die.

---

## Finding 5: Integration test results — Not checked before advancing to evaluate

**What the code claims:** The pipeline definition in `src/commands/init.ts:48-60` describes the `integrate` phase gate as requiring "all integration checkpoint tests passing" and "no contract violations".

**What actually happens:** The engine's `executePhase()` method (`engine.ts:420-429`) spawns an integration-tester agent and waits for it to complete. However, **the engine never checks the integration-tester's reported score or pass/fail status** before advancing to `evaluate-functional`. The evaluation gate (`checkEvaluationGate`) only runs after `evaluate-functional` and `evaluate-change` phases (line 121), not after `integrate`. If the integration-tester reports `--passed false`, the engine still advances to evaluation.

**Severity:** Critical — A failing integration phase does not block the pipeline. The engine advances to evaluation even when integration tests fail, defeating the purpose of the integrate gate.

---

## Finding 6: Contract acknowledgment — Never verified by engine before building starts

**What the code claims:** The pipeline definition in `src/commands/init.ts:44` lists "all contracts acknowledged" as a build gate condition. The `contract_bindings` table has an `acknowledged` column, and `acknowledgeContract()` exists in `src/db/queries/contracts.ts:87`.

**What actually happens:** Contract bindings are created in `build-phase.ts:288-292` with `acknowledged: 0`. There is no code in the engine or build phase that **checks whether builders have acknowledged their contracts** before or during the build. The `acknowledgeContract()` function exists but is only callable by agents via a CLI command — the engine never gates on it. The build proceeds regardless of acknowledgment status.

**Severity:** Medium — The contract acknowledgment system is instrumented (DB schema, query functions, binding creation) but the engine never enforces the gate. Builders can complete without ever reading their contracts.

---

## Finding 7: `handlePhaseFailure` — Only called from evaluation gate, not from other failure paths

**What the code claims:** `handlePhaseFailure` (engine.ts:492-507) implements the retry-from-build logic with iteration tracking.

**What actually happens:** `handlePhaseFailure` is called **only from `checkEvaluationGate`** (engine.ts:546). When other phases fail (architect, build, integrate, merge), they throw exceptions caught by the outer `try/catch` in `execute()` (line 182), which **immediately fails the entire run** without retry. The iteration logic (`on_fail` → retry from build) described in the pipeline definition (`init.ts:91`: `iteration_trigger: "evaluate-functional.on_fail OR evaluate-change.on_fail OR integrate.on_fail"`) includes `integrate.on_fail`, but integrate failures throw and kill the run — they don't trigger a retry.

**Severity:** Critical — The pipeline definition claims integration failures trigger a retry iteration, but the engine doesn't implement this. Integration, build, architect, and merge failures are all fatal — only evaluation failures get retry logic.

---

## Finding 8: `PhaseDefinition` interface — Defined but never instantiated or used

**What the code claims:** `src/pipeline/phases.ts:11-25` defines a `PhaseDefinition` interface with `gate` (artifact/decision/threshold/compound), `timeout_min`, and `on_fail` properties. The pipeline definition in `init.ts` creates objects matching this structure.

**What actually happens:** The `PhaseDefinition` interface is **never imported or used** outside of `phases.ts`. The engine does not load, parse, or evaluate phase definitions at runtime. The phase definitions in `init.ts` are written to `.df/pipeline.yaml` during `dark init` but **never read back** by the engine. The engine uses a hardcoded `PHASE_ORDER` array and `shouldSkipPhase()` function instead of evaluating the declarative gate/on_fail/timeout_min properties.

**Severity:** Medium — The entire phase definition system (gates, timeouts, on_fail actions) is an unused abstraction. Operators who read `pipeline.yaml` will believe gates are enforced declaratively, but the engine ignores them entirely.

---

## Finding 9: `build.max_module_retries` and `shouldRedecompose` — Defined but never called from build phase

**What the config claims:** `max_module_retries: 2` — implies modules that fail repeatedly will trigger re-decomposition via a mini-architect.

**What actually happens:** `shouldRedecompose()` is defined in `src/db/queries/failure-tracking.ts:83-92` and correctly implements the threshold check. However, it is **never called from `build-phase.ts`** or any other pipeline module. When a builder fails, the build phase throws immediately (build-phase.ts:367), killing the run. There is no per-module retry loop that would call `shouldRedecompose()`.

**Severity:** Medium — The re-decomposition system (failure tracking, threshold check, the concept of a mini-architect) is fully implemented in the query layer but never wired into the build phase. Failed modules always crash the run instead of retrying or re-decomposing.

---

## Finding 10: Budget checks — Enforced but with a timing gap

**What the code claims:** Budget is checked and the run is paused when 100% is reached.

**What actually happens:** Budget enforcement has two layers:
1. **Engine loop** (engine.ts:134-152): `checkBudgetThresholds()` runs after each phase completes. It pauses at 100% and warns at 80%. This works correctly.
2. **Build phase** (build-phase.ts:398-401): `checkBudget()` runs once per poll cycle. It throws on `overBudget` (spend > budget).

**The gap:** Both checks only run *between* phases or *between* poll cycles (every 5 seconds). A single agent can spend an unlimited amount within a phase before the next check fires. For expensive agents (e.g., Opus), costs can significantly overshoot the budget before the next poll catches it. Additionally, the build phase check (layer 2) throws an error rather than cleanly pausing, so budget overruns during build crash the run instead of pausing it gracefully.

**Severity:** Low — Budget is enforced, just not in real-time. The overshoot window is bounded by the poll interval. The inconsistency between pause (engine) and throw (build phase) on budget overrun is a minor UX issue.

---

## Finding 11: Max iterations — Enforced only via evaluation gate path

**What the code claims:** `max_iterations: 3` limits retry cycles.

**What actually happens:** Max iterations are checked in `handlePhaseFailure` (engine.ts:498) which is only called from `checkEvaluationGate`. The iteration counter is correctly incremented and the run is failed when `max_iterations` is reached. However, since `handlePhaseFailure` is only reachable from evaluation failures (Finding 7), this means max iterations only limits evaluation-triggered retries — not retries from other failure paths (which don't retry at all, they crash).

**Severity:** Low (given Finding 7) — Max iterations enforcement is correct for the one path that uses it. The real issue is Finding 7: other failure paths don't retry at all, so there's nothing to limit.

---

## Finding 12: `plan-review` phase — Auto-approved, no human gate

**What the code claims:** Pipeline definition (`init.ts:29-33`) describes plan-review as: "For complex builds (>4 modules), presents summary to human for approval" with gate type "decision" and `auto_approve_when: "buildplan.modules.length <= 4"`.

**What actually happens:** The engine's `executePhase()` for `plan-review` (engine.ts:412-414) simply logs `"Plan review: auto-approved"` and returns. There is **no conditional logic** — it auto-approves regardless of module count. The declarative `auto_approve_when` condition is never evaluated.

**Severity:** Medium — Operators expecting human approval for large (>4 module) buildplans will never be prompted. All plans are silently auto-approved.

---

## Summary Table

| # | Finding | Severity |
|---|---------|----------|
| 1 | `heartbeat_interval_ms` — defined but never read | Low |
| 2 | `max_agent_lifetime_ms` — defined but never enforced | Medium |
| 3 | `max_worktrees` / `max_api_slots` — resource limits never checked before spawning | **Critical** |
| 4 | Heartbeat timeout — stale agents logged, never killed | Medium |
| 5 | Integration test results — not checked before advancing to evaluate | **Critical** |
| 6 | Contract acknowledgment — never verified before building | Medium |
| 7 | `handlePhaseFailure` — only called from evaluation, not integrate/build failures | **Critical** |
| 8 | `PhaseDefinition` interface — declarative gates/timeouts/on_fail never evaluated | Medium |
| 9 | `max_module_retries` / `shouldRedecompose` — implemented but never called | Medium |
| 10 | Budget checks — enforced but with timing gap and inconsistent error handling | Low |
| 11 | Max iterations — enforced only on eval-triggered retries (correct for that path) | Low |
| 12 | `plan-review` — always auto-approved, ignores module count threshold | Medium |

**Critical findings: 3** — Resource limits unenforced (#3), integration gate bypassed (#5), retry logic incomplete (#7)
**Medium findings: 6** — Agent lifetime (#2), stale agents (#4), contracts (#6), phase definitions (#8), redecomposition (#9), plan review (#12)
**Low findings: 3** — Heartbeat interval (#1), budget timing (#10), max iterations scope (#11)
