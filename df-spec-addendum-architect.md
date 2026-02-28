---
id: df-cli-addendum-architect
type: feature
status: draft
version: 0.1.1
parent: df-cli
priority: high
---

# Dark Factory CLI — Addendum: Architect Agent & Parallel Build Orchestration

This addendum modifies the base `df-cli` spec to introduce the Architect agent role, interface contracts, builder dependencies, integration testing, and resource management. It supersedes Section 4.1 (Layer Model) and Section 5 (CLI Specification) of the base spec where noted.

---

## 1. Revised Agent Taxonomy

### 1.1 Updated Rationale

The base spec assigned technical decomposition to the Orchestrator. This was wrong for two reasons:

**Context window pollution.** The Orchestrator's context is consumed by human conversation history, pipeline state, decision tracking, and cost management. Asking it to simultaneously load an entire codebase, reason about module boundaries, produce TypeScript interface definitions, and generate dependency DAGs degrades decomposition quality as conversations lengthen.

**Role contradiction.** The Orchestrator definition states "you do not write code" but producing interface contracts requires writing type definitions, API shapes, and structural specifications. These are code artifacts, even if they're not production code. An agent with explicit permission and context for technical artifacts resolves this cleanly.

### 1.2 Five Agent Roles

| Role | Lifespan | Codebase Access | Scenario Access | Writes Code | Talks to Human |
|------|----------|----------------|-----------------|-------------|----------------|
| **Orchestrator** | Persistent (session) | None | Management only | No | Yes |
| **Architect** | Medium (5-10 min) | Read-only | No | Contracts only | No |
| **Builder** | Long (10-45 min) | Read-write (worktree) | No | Yes | No |
| **Evaluator** | Medium (5-20 min) | Read-only (builder output) | Yes | No | No |
| **Merger** | Short (1-5 min) | Read-write (target branch) | No | No | No |

An optional sixth role, **Integration-Tester**, handles post-parallel-build composition validation. This can be a mode of the Evaluator or a standalone agent depending on complexity.

### 1.3 Updated Layer Model

```
┌──────────────────────────────────────────────┐
│  Layer 0: Human                              │
│  Sets goals, reviews specs, approves plans,  │
│  provides judgment at decision points        │
└─────────────────┬────────────────────────────┘
                  │ natural language
                  ▼
┌──────────────────────────────────────────────┐
│  Layer 1: Orchestrator                       │
│  Manages pipeline, surfaces decisions,       │
│  translates goals → specs. Uses df CLI.      │
└─────────────────┬────────────────────────────┘
                  │ df CLI (JSON)
                  ▼
┌──────────────────────────────────────────────┐
│  Layer 2: Architect                          │
│  Technical decomposition. Reads codebase.    │
│  Produces buildplans, contracts, dep graphs. │
│  Handles contract change requests.           │
└─────────────────┬────────────────────────────┘
                  │ buildplan + contracts
                  ▼
┌──────────────────────────────────────────────┐
│  Layer 3: Factory Agents                     │
│  Builder(s): implement in isolated worktrees │
│  Evaluator: validates against holdout set    │
│  Integration-Tester: composition validation  │
│  Merger: branch integration                  │
└──────────────────────────────────────────────┘
```

**Communication flow for contract issues:**

```
Builder discovers contract needs change
  → df mail to Architect
  → Architect assesses impact
  → If additive: Architect updates contract, notifies consumers
  → If breaking: Architect escalates to Orchestrator
  → If scope impact: Orchestrator escalates to Human
```

This chain means the Orchestrator is never reasoning about type definitions, and the Human is never asked to evaluate interface contracts (unless scope is affected). Each layer absorbs the decisions appropriate to its role.

---

## 2. New CLI Commands

### 2.1 Architect Commands (called by Orchestrator)

```
df architect analyze <spec-id> [--codebase-paths <paths>]
```
Spawns an Architect agent. The agent reads the spec and codebase, produces a buildplan. Returns immediately with an agent ID; the buildplan is submitted asynchronously via `df architect submit-plan`.

```
df architect submit-plan <agent-id> --plan <json|file>
```
Called by the Architect agent to submit its buildplan. Validates structure: all modules have IDs, all dependencies reference valid module IDs, no cycles in dependency graph, contracts have content, estimates are present.

```
df architect get-plan <spec-id> [--run-id <run-id>]
```
Retrieves the active buildplan for a spec. Used by the Orchestrator to review before approving.

```
df architect revise <spec-id> --feedback "<feedback>"
```
Triggers a new Architect analysis incorporating feedback. Creates a new buildplan version.

### 2.2 Contract Commands (called by Architect and Builders)

```
df contract list [--spec <spec-id>] [--run-id <run-id>]
df contract show <contract-id>
```
List and inspect contracts.

```
df contract update <contract-id> --content <content> --reason "<reason>"
```
Architect updates a contract. Increments version. Triggers `contract-update` mail to all bound agents.

```
df contract acknowledge <contract-id> --agent <agent-id>
```
Builder confirms it has loaded and understood the contract. Tracked in `contract_bindings.acknowledged`.

```
df contract check <contract-id> --agent <agent-id>
```
Validates that a builder's output structurally conforms to the contract. Checks type compatibility, not behavioral correctness.

### 2.3 Integration Commands (called by Orchestrator)

```
df integrate <run-id> [--phase <n>] [--modules <ids>]
```
Spawns an Integration-Tester agent to compose and validate specified builder outputs. Uses the integration strategy from the buildplan.

```
df integrate status [--run-id <run-id>]
```
Status of integration test runs.

### 2.4 Resource Commands (called by Orchestrator)

```
df resource status [--json]
```
Shows resource availability: worktrees, API slots, tmux sessions. Used by the Orchestrator to decide whether to spawn more builders or queue them.

```
df resource set <resource-id> --capacity <n>
```
Adjusts resource capacity. For example, increase API slot capacity after upgrading the API plan.

### 2.5 Updated Build Command

The `df build` command now includes an architecture phase:

```
df build <spec-id> \
    [--mode quick|thorough] \
    [--parallel <n>] \
    [--budget-usd <amount>] \
    [--skip-architect]           # for single-module specs that don't need decomposition
```

When `--skip-architect` is not set, the build pipeline becomes:
1. Orchestrator spawns Architect
2. Architect produces buildplan
3. Orchestrator reviews buildplan, optionally presents to human
4. Orchestrator spawns builders per buildplan, respecting dependency DAG
5. Builders complete → integration tests run (if parallel build)
6. Evaluator runs holdout scenarios
7. Iterate or merge

For simple, single-module specs, `--skip-architect` skips directly to step 4 with a single builder. The Orchestrator should use judgment on when to skip: a one-endpoint API addition doesn't need an architect; a new service with multiple components does.

---

## 3. Updated Pipeline Definition

```yaml
# .df/pipeline.yaml — v2 with architect phase

name: default-v2
version: 2

phases:
  - id: scout
    agent: orchestrator
    description: >
      Initial codebase mapping and expertise loading.
    gate:
      type: artifact
      artifact: context summary produced

  - id: architect
    agent: architect
    description: >
      Technical decomposition. Produces buildplan with module
      definitions, interface contracts, dependency DAG, and
      integration strategy.
    skip_when: run.config.skip_architect == true
    gate:
      type: artifact
      artifact: buildplan submitted and validated
    timeout_min: 10

  - id: plan-review
    agent: orchestrator
    description: >
      Orchestrator reviews buildplan. For complex builds
      (>4 modules), presents summary to human for approval.
      For simple builds (≤4 modules), approves autonomously.
    gate:
      type: decision
      auto_approve_when: buildplan.modules.length <= 4

  - id: build
    agent: builder (multiple, per buildplan)
    description: >
      TDD cycle per module per builder. Builders spawn in
      dependency order per buildplan. Resource-limited by
      available worktrees and API slots.
    gate:
      type: compound
      conditions:
        - all builder tests passing
        - all quality commands passing
        - all assigned issues in done status
        - all contracts acknowledged
    constraints:
      - worktree isolation (no scenario access)
      - TDD phase enforcement
      - contract compliance
      - budget cap per builder

  - id: integrate
    agent: integration-tester
    description: >
      Compose parallel builder outputs. Verify modules work
      together. Check contract compliance. Run checkpoint tests
      from buildplan.
    skip_when: buildplan.modules.length <= 1
    gate:
      type: compound
      conditions:
        - all integration checkpoint tests passing
        - no contract violations
        - all quality commands passing on composed code
    on_fail:
      action: >
        Identify which module boundary failed. Route to
        architect for contract assessment. Architect decides
        whether to update contract or escalate.

  - id: evaluate-functional
    agent: evaluator
    description: >
      Run functional holdout scenarios against integrated code.
    gate:
      type: threshold
      metric: satisfaction
      threshold: config.thresholds.satisfaction
    constraints:
      - separate LLM context
      - never transmit scenario text
    on_fail:
      action: failure descriptions to orchestrator
      next: orchestrator decides iterate | escalate

  - id: evaluate-change
    agent: evaluator
    description: >
      Run change holdout scenarios. Fresh builders attempt
      modifications, measure files touched and effort.
    skip_when: config.build.default_mode == "quick"
    gate:
      type: threshold
      metric: changeability
      threshold: config.thresholds.changeability
    on_fail:
      action: failure descriptions to orchestrator

  - id: merge
    agent: merger
    description: >
      Integrate into target branch. Post-merge validation.
    gate:
      type: compound
      conditions:
        - merge completed
        - all tests passing post-merge
        - all quality commands passing post-merge
    on_conflict:
      action: escalate to orchestrator

iteration:
  max_iterations: 3
  iteration_trigger: >
    evaluate-functional.on_fail OR evaluate-change.on_fail
    OR integrate.on_fail
  iteration_target: build
  # On integration failure, architect may revise contracts before rebuild
  pre_iteration_hook: >
    If integration failed, architect reviews and optionally
    updates contracts before builders restart.
```

---

## 4. Schema Additions (state-v2 supplement)

### 4.1 Buildplans Table

```sql
CREATE TABLE IF NOT EXISTS buildplans (
    id              TEXT    PRIMARY KEY,          -- plan_<ulid>
    run_id          TEXT    NOT NULL REFERENCES runs(id),
    spec_id         TEXT    NOT NULL,
    architect_agent_id TEXT NOT NULL REFERENCES agents(id),
    version         INTEGER NOT NULL DEFAULT 1,
    status          TEXT    NOT NULL DEFAULT 'draft',
                    -- draft | active | superseded | rejected
    
    -- The full buildplan JSON
    plan            TEXT    NOT NULL,             -- JSON: modules, contracts, deps, estimates
    
    -- Summary metrics (extracted from plan for queries)
    module_count    INTEGER NOT NULL,
    contract_count  INTEGER NOT NULL,
    max_parallel    INTEGER NOT NULL,
    critical_path_modules TEXT,                   -- JSON array of module IDs on critical path
    estimated_duration_min INTEGER,
    estimated_cost_usd REAL,
    estimated_tokens INTEGER,
    
    -- Review
    reviewed_by     TEXT,                         -- 'orchestrator' or 'human'
    review_notes    TEXT,
    
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX idx_buildplans_run ON buildplans(run_id);
CREATE INDEX idx_buildplans_spec ON buildplans(spec_id);
CREATE INDEX idx_buildplans_status ON buildplans(status);
```

### 4.2 Updated Agents Table

Add column to link builders to their module assignment:

```sql
ALTER TABLE agents ADD COLUMN module_id TEXT;
    -- Links builder to its assigned module from the buildplan
ALTER TABLE agents ADD COLUMN buildplan_id TEXT REFERENCES buildplans(id);
    -- Which buildplan this agent was spawned from
```

### 4.3 Parallel Build Progress View

```sql
CREATE VIEW IF NOT EXISTS parallel_build_progress AS
SELECT
    bp.run_id,
    bp.spec_id,
    json_each.value AS module_id,
    a.id AS agent_id,
    a.name AS agent_name,
    a.status AS agent_status,
    a.tdd_phase,
    a.tdd_cycles,
    a.cost_usd,
    a.tokens_used,
    a.queue_wait_ms,
    a.total_active_ms,
    -- How many of this builder's dependencies are satisfied?
    (SELECT COUNT(*) FROM builder_dependencies bd 
     WHERE bd.builder_id = a.id AND bd.satisfied = 1) AS deps_satisfied,
    (SELECT COUNT(*) FROM builder_dependencies bd 
     WHERE bd.builder_id = a.id) AS deps_total,
    -- How many contracts has this builder acknowledged?
    (SELECT COUNT(*) FROM contract_bindings cb 
     WHERE cb.agent_id = a.id AND cb.acknowledged = 1) AS contracts_acknowledged,
    (SELECT COUNT(*) FROM contract_bindings cb 
     WHERE cb.agent_id = a.id) AS contracts_total
FROM buildplans bp,
     json_each(bp.plan, '$.modules') 
LEFT JOIN agents a ON a.module_id = json_extract(json_each.value, '$.id')
    AND a.run_id = bp.run_id
WHERE bp.status = 'active';
```

---

## 5. Updated Orchestrator Behavior

### 5.1 When to Use the Architect

The Orchestrator should spawn an Architect when:
- The spec involves multiple components, services, or modules
- The estimated scope exceeds ~500 lines of code
- The spec mentions integration with multiple existing systems
- The human explicitly requests parallel build
- The codebase is large enough that decomposition requires reading source

The Orchestrator should skip the Architect (`--skip-architect`) when:
- The spec is a single endpoint, function, or component
- The change is a modification to existing code, not a new system
- The estimated scope is under ~200 lines of code
- There's only one natural module boundary (or none)

### 5.2 Reviewing Buildplans

When the Architect submits a buildplan, the Orchestrator:

1. Validates structure: no dependency cycles, all estimates present, contracts have content.
2. Checks budget: does estimated cost fit within the run budget? If not, ask the Architect to propose a reduced scope.
3. For simple plans (≤4 modules): approve autonomously and proceed.
4. For complex plans (>4 modules): present a summary to the human. The summary includes module names, critical path, estimated time, estimated cost, and any risks the Architect flagged. The human approves, requests changes, or rejects.

### 5.3 Handling Contract Change Requests

When the Architect escalates a contract change to the Orchestrator:

- **Additive changes within budget:** Approve, log the decision, continue.
- **Modifications requiring builder restarts:** Calculate the cost of restarting affected builders. If within budget, approve. If it would exceed budget, escalate to human with the cost tradeoff.
- **Breaking changes affecting scope:** Always escalate to human. Present: what changed, why, what it costs, and the Architect's recommendation.

### 5.4 Updated Escalation Framework

Add to "Always escalate to human":
- Buildplan approval for complex builds (>4 modules)
- Breaking contract changes that affect scope

Add to "Flag proactively, keep working":
- Contract modifications that require builder restarts (within budget)
- Integration test failures that the Architect can address

Add to "Handle autonomously":
- Additive contract changes
- Buildplan approval for simple builds (≤4 modules)
- Architect spawning based on spec complexity heuristics

---

## 6. Design Note: Why Not More Agent Types?

We considered and rejected the following additional agent types:

**Scout (separate from Orchestrator):** A dedicated codebase exploration agent. Rejected because the Architect subsumes this role — it already reads the codebase with full context. A separate scout adds a communication hop and context transfer cost with no quality benefit.

**Reviewer (separate from Evaluator):** A dedicated code review agent. Rejected because the Evaluator's holdout scenarios and the change scenarios together catch both functional defects and structural problems. A "code review" agent that reads source and gives opinions is exactly the subjective LLM judgment we're replacing with empirical measurement.

**Monitor (separate from Watchdog):** A dedicated health monitoring agent. Rejected as overkill for v1. The watchdog daemon (mechanical heartbeat checks) plus the Orchestrator's pipeline management covers health monitoring. A separate LLM-powered monitor agent adds cost without proportional benefit until the system is running dozens of concurrent builds.

Each of these may become warranted as the system scales. But for v1, five agent types (Orchestrator, Architect, Builder, Evaluator, Merger) plus the optional Integration-Tester cover the full pipeline with minimal coordination overhead.
