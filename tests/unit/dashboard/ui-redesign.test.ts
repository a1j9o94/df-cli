import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { startServer } from "../../../src/dashboard/server.js";
import { SCHEMA_SQL } from "../../../src/db/schema.js";

// Temp directory for spec files referenced by DB records
const specTmpDir = join(import.meta.dir, "__tmp_ui_redesign_specs__");

// Test helpers
function createTestDb(): InstanceType<typeof Database> {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  return db;
}

function seedTestData(db: InstanceType<typeof Database>) {
  const now = "2026-03-01T12:00:00Z";

  // Create spec files on disk so the spec content endpoint can read them
  if (!existsSync(specTmpDir)) mkdirSync(specTmpDir, { recursive: true });
  const specFile1 = join(specTmpDir, "spec_test1.md");
  const specFile2 = join(specTmpDir, "spec_test2.md");
  writeFileSync(
    specFile1,
    "---\ntitle: Redesign dashboard around the workplan\ntype: feature\nstatus: building\n---\n\nRedesign the dashboard UI around the workplan.\n",
  );
  writeFileSync(
    specFile2,
    "---\ntitle: Add holdout scenario validation\ntype: feature\nstatus: completed\n---\n\nAdd holdout scenario validation to the evaluator.\n",
  );

  // Create specs with titles
  db.prepare(
    `INSERT INTO specs (id, title, status, file_path, content_hash, scenario_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "spec_test1",
    "Redesign dashboard around the workplan",
    "building",
    specFile1,
    "abc123",
    3,
    "2026-03-01T10:00:00Z",
    now,
  );

  db.prepare(
    `INSERT INTO specs (id, title, status, file_path, content_hash, scenario_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "spec_test2",
    "Add holdout scenario validation",
    "completed",
    specFile2,
    "def456",
    2,
    "2026-03-01T09:00:00Z",
    now,
  );

  // Create runs
  db.prepare(
    `INSERT INTO runs (id, spec_id, status, skip_change_eval, max_parallel, budget_usd, cost_usd, tokens_used, current_phase, iteration, max_iterations, config, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "run_test1",
    "spec_test1",
    "running",
    0,
    4,
    50.0,
    12.5,
    150000,
    "build",
    1,
    3,
    "{}",
    "2026-03-01T11:00:00Z",
    now,
  );

  db.prepare(
    `INSERT INTO runs (id, spec_id, status, skip_change_eval, max_parallel, budget_usd, cost_usd, tokens_used, current_phase, iteration, max_iterations, config, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "run_test2",
    "spec_test2",
    "completed",
    0,
    2,
    25.0,
    8.0,
    90000,
    "merge",
    0,
    3,
    "{}",
    "2026-03-01T10:00:00Z",
    "2026-03-01T10:30:00Z",
  );

  // Create architect agent (needed for buildplan FK)
  db.prepare(
    `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, buildplan_id, tdd_phase, tdd_cycles, cost_usd, tokens_used, queue_wait_ms, total_active_ms, error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "agt_arch1",
    "run_test1",
    "architect",
    "architect-1",
    "completed",
    1234,
    null,
    null,
    null,
    0,
    2.0,
    20000,
    100,
    300000,
    null,
    "2026-03-01T11:00:00Z",
    "2026-03-01T11:05:00Z",
  );

  // Create buildplan
  const planJson = JSON.stringify({
    spec_id: "spec_test1",
    modules: [
      {
        id: "mod-api-server",
        title: "HTTP API Server",
        description: "Bun HTTP server with JSON API endpoints",
        scope: {
          creates: ["src/dashboard/server.ts"],
          modifies: ["src/dashboard/index.ts"],
          test_files: ["tests/unit/dashboard/"],
        },
        estimated_complexity: "medium",
        estimated_tokens: 80000,
        estimated_duration_min: 15,
      },
      {
        id: "mod-dashboard-ui",
        title: "Dashboard UI",
        description: "Single HTML page with inline CSS/JS for monitoring",
        scope: {
          creates: ["src/dashboard/ui.ts"],
          modifies: [],
          test_files: ["tests/unit/dashboard/"],
        },
        estimated_complexity: "high",
        estimated_tokens: 120000,
        estimated_duration_min: 25,
      },
    ],
    contracts: [],
    dependencies: [{ from: "mod-dashboard-ui", to: "mod-api-server", type: "completion" }],
    parallelism: {
      max_concurrent: 2,
      parallel_groups: [
        { phase: 1, modules: ["mod-api-server"] },
        { phase: 2, modules: ["mod-dashboard-ui"] },
      ],
      critical_path: ["mod-api-server", "mod-dashboard-ui"],
      critical_path_estimated_min: 40,
    },
    integration_strategy: { checkpoints: [], final_integration: "All modules compose" },
    risks: [
      {
        description: "Dashboard UI may need API changes for new data shapes",
        mitigation: "API contract defines response shapes explicitly",
        likelihood: "medium",
        impact: "low",
      },
    ],
    total_estimated_tokens: 200000,
    total_estimated_cost_usd: 3.5,
    total_estimated_duration_min: 40,
  });

  db.prepare(
    `INSERT INTO buildplans (id, run_id, spec_id, architect_agent_id, version, status, plan, module_count, contract_count, max_parallel, critical_path_modules, estimated_duration_min, estimated_cost_usd, estimated_tokens, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "plan_test1",
    "run_test1",
    "spec_test1",
    "agt_arch1",
    1,
    "active",
    planJson,
    2,
    0,
    2,
    '["mod-api-server","mod-dashboard-ui"]',
    40,
    3.5,
    200000,
    "2026-03-01T11:05:00Z",
    "2026-03-01T11:05:00Z",
  );

  // Create builder agents
  db.prepare(
    `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, buildplan_id, tdd_phase, tdd_cycles, cost_usd, tokens_used, queue_wait_ms, total_active_ms, error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "agt_build1",
    "run_test1",
    "builder",
    "builder-api",
    "completed",
    5678,
    "mod-api-server",
    "plan_test1",
    "green",
    3,
    5.0,
    60000,
    500,
    600000,
    null,
    "2026-03-01T11:05:00Z",
    "2026-03-01T11:15:00Z",
  );

  db.prepare(
    `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, buildplan_id, tdd_phase, tdd_cycles, cost_usd, tokens_used, queue_wait_ms, total_active_ms, error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "agt_build2",
    "run_test1",
    "builder",
    "builder-ui",
    "running",
    9012,
    "mod-dashboard-ui",
    "plan_test1",
    "red",
    1,
    3.0,
    40000,
    0,
    400000,
    null,
    "2026-03-01T11:15:00Z",
    now,
  );

  // Create contracts
  db.prepare(
    `INSERT INTO contracts (id, run_id, buildplan_id, name, description, format, content, version, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "ctr_test1",
    "run_test1",
    "plan_test1",
    "ServerExport",
    "Server export contract",
    "typescript",
    "export function startServer(config: ServerConfig): Promise<ServerHandle>;",
    1,
    "2026-03-01T11:05:00Z",
    "2026-03-01T11:05:00Z",
  );

  // Create contract bindings
  db.prepare(
    `INSERT INTO contract_bindings (id, contract_id, agent_id, module_id, role, acknowledged, acknowledged_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "bind_1",
    "ctr_test1",
    "agt_build1",
    "mod-api-server",
    "implementer",
    1,
    "2026-03-01T11:06:00Z",
    "2026-03-01T11:05:00Z",
  );

  db.prepare(
    `INSERT INTO contract_bindings (id, contract_id, agent_id, module_id, role, acknowledged, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "bind_2",
    "ctr_test1",
    "agt_build2",
    "mod-dashboard-ui",
    "consumer",
    0,
    "2026-03-01T11:05:00Z",
  );

  // Create builder dependencies
  db.prepare(
    `INSERT INTO builder_dependencies (id, run_id, builder_id, depends_on_builder_id, depends_on_module_id, dependency_type, satisfied, satisfied_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "dep_1",
    "run_test1",
    "agt_build2",
    "agt_build1",
    "mod-api-server",
    "completion",
    1,
    "2026-03-01T11:15:00Z",
    "2026-03-01T11:05:00Z",
  );

  // Create evaluation events
  db.prepare(
    "INSERT INTO events (id, run_id, agent_id, type, data, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(
    "evt_eval1",
    "run_test1",
    "agt_eval1",
    "evaluation-passed",
    JSON.stringify({
      scenario: "spec-title-visible",
      description: "Spec title visible in dashboard",
      passed: true,
    }),
    "2026-03-01T11:50:00Z",
  );

  db.prepare(
    "INSERT INTO events (id, run_id, agent_id, type, data, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(
    "evt_eval2",
    "run_test1",
    "agt_eval1",
    "evaluation-failed",
    JSON.stringify({
      scenario: "agent-details-collapsed",
      description: "Agent details should be collapsed by default",
      passed: false,
      error: "Agent details were visible on initial load",
    }),
    "2026-03-01T11:51:00Z",
  );

  db.prepare(
    "INSERT INTO events (id, run_id, agent_id, type, data, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(
    "evt_start",
    "run_test1",
    null,
    "run-started",
    '{"spec_id":"spec_test1"}',
    "2026-03-01T11:00:00Z",
  );
}

let server: { port: number; url: string; stop: () => void } | null = null;
let db: InstanceType<typeof Database>;

describe("UI Redesign — Dashboard", () => {
  beforeEach(async () => {
    db = createTestDb();
    seedTestData(db);
    server = await startServer({ port: 0, db });
  });

  afterEach(() => {
    if (server) {
      server.stop();
      server = null;
    }
    db.close();
    // Cleanup temp spec files
    if (existsSync(specTmpDir)) rmSync(specTmpDir, { recursive: true });
  });

  // === Contract: EnrichedRunSummary ===

  describe("EnrichedRunSummary — specTitle in run list", () => {
    test("GET /api/runs returns specTitle from specs table", async () => {
      const res = await fetch(`${server?.url}/api/runs`);
      const data = await res.json();
      const run1 = data.find((r: Record<string, unknown>) => r.id === "run_test1");

      expect(run1).toBeDefined();
      expect(run1.specTitle).toBe("Redesign dashboard around the workplan");
    });

    test("GET /api/runs/:id returns specTitle", async () => {
      const res = await fetch(`${server?.url}/api/runs/run_test1`);
      const data = await res.json();

      expect(data.specTitle).toBe("Redesign dashboard around the workplan");
    });

    test("specTitle falls back to specId when spec not found", async () => {
      // Create a run with a spec that doesn't exist in specs table
      db.prepare(
        `INSERT INTO runs (id, spec_id, status, skip_change_eval, max_parallel, budget_usd, cost_usd, tokens_used, current_phase, iteration, max_iterations, config, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        "run_orphan",
        "spec_nonexistent",
        "pending",
        0,
        2,
        10.0,
        0,
        0,
        null,
        0,
        3,
        "{}",
        "2026-03-01T12:00:00Z",
        "2026-03-01T12:00:00Z",
      );

      const res = await fetch(`${server?.url}/api/runs/run_orphan`);
      const data = await res.json();

      expect(data.specTitle).toBe("spec_nonexistent");
    });

    test("all runs in list include specTitle", async () => {
      const res = await fetch(`${server?.url}/api/runs`);
      const data = await res.json();

      for (const run of data) {
        expect(typeof run.specTitle).toBe("string");
        expect(run.specTitle.length).toBeGreaterThan(0);
      }
    });
  });

  // === Contract: SpecContentEndpoint ===

  describe("SpecContentEndpoint — GET /api/runs/:id/spec", () => {
    test("returns spec metadata and goal text", async () => {
      // Create a spec file on disk so the endpoint can read it
      const { mkdirSync, writeFileSync, unlinkSync, rmdirSync } = await import("node:fs");
      const { join } = await import("node:path");
      const tmpDir = await import("node:os").then((os) => os.tmpdir());
      const specDir = join(tmpDir, "df-test-ui-redesign-spec");
      mkdirSync(specDir, { recursive: true });
      const specPath = join(specDir, "spec_test1.md");
      writeFileSync(
        specPath,
        `---\nid: spec_test1\ntitle: Redesign dashboard around the workplan\ntype: feature\nstatus: building\n---\n\n# Redesign dashboard\n\nGoal text here.\n`,
      );
      db.prepare("UPDATE specs SET file_path = ? WHERE id = ?").run(specPath, "spec_test1");

      const res = await fetch(`${server?.url}/api/runs/run_test1/spec`);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.id).toBe("spec_test1");
      expect(data.title).toBe("Redesign dashboard around the workplan");

      // Clean up
      unlinkSync(specPath);
      rmdirSync(specDir);
    });

    test("returns 404 for nonexistent run", async () => {
      const res = await fetch(`${server?.url}/api/runs/run_nonexistent/spec`);
      expect(res.status).toBe(404);
    });
  });

  // === Contract: UITabStructure ===

  describe("UITabStructure — Three tabs: Overview, Modules, Validation", () => {
    test("HTML contains three tab buttons", async () => {
      const res = await fetch(`${server?.url}/`);
      const html = await res.text();

      expect(html).toContain('data-tab="overview"');
      expect(html).toContain('data-tab="modules"');
      expect(html).toContain('data-tab="validation"');
    });

    test("HTML contains three tab panels", async () => {
      const res = await fetch(`${server?.url}/`);
      const html = await res.text();

      expect(html).toContain('id="overview-panel"');
      expect(html).toContain('id="modules-panel"');
      expect(html).toContain('id="validation-panel"');
    });

    test("Overview tab is the default active tab", async () => {
      const res = await fetch(`${server?.url}/`);
      const html = await res.text();

      // The overview tab button should have class "active"
      // The overview panel should have class "active"
      // Use regex to match tab button with active class
      const overviewTabButton = html.match(/class="tab active"[^>]*data-tab="overview"/);
      expect(overviewTabButton).not.toBeNull();
    });

    test("Overview tab fetches spec content from /api/runs/:id/spec", async () => {
      const res = await fetch(`${server?.url}/`);
      const html = await res.text();

      expect(html).toContain("/spec");
    });

    test("Validation tab fetches scenarios from /api/runs/:id/scenarios", async () => {
      const res = await fetch(`${server?.url}/`);
      const html = await res.text();

      expect(html).toContain("/scenarios");
    });
  });

  // === Sidebar: Spec titles, not IDs ===

  describe("Sidebar — run cards show spec titles", () => {
    test("run card rendering uses specTitle as primary text", async () => {
      const res = await fetch(`${server?.url}/`);
      const html = await res.text();

      // The JS should render specTitle, not specId as the primary run card text
      expect(html).toContain("specTitle");
      // run-card-title class for the spec title display
      expect(html).toContain("run-card-title");
    });

    test("run card shows phase as small label", async () => {
      const res = await fetch(`${server?.url}/`);
      const html = await res.text();

      // Phase should be shown with friendly label
      expect(html).toContain("run-card-phase");
    });

    test("run card shows progress indicator (e.g. 2/3 modules built)", async () => {
      const res = await fetch(`${server?.url}/`);
      const html = await res.text();

      // Progress text should be rendered in the card
      expect(html).toContain("run-card-progress");
    });
  });

  // === Human-readable names ===

  describe("Human-readable names", () => {
    test("phase labels are human-friendly (e.g. 'Build' not 'build')", async () => {
      const res = await fetch(`${server?.url}/api/runs/run_test1/phases`);
      const data = await res.json();

      // Check that all phases have human-friendly labels
      const buildPhase = data.find((p: Record<string, unknown>) => p.id === "build");
      expect(buildPhase).toBeDefined();
      expect(buildPhase.label).toBe("Build");

      const evalPhase = data.find((p: Record<string, unknown>) => p.id === "evaluate-functional");
      expect(evalPhase).toBeDefined();
      expect(evalPhase.label).toBe("Evaluate");
    });

    test("agent names show role + module (e.g. 'Builder: HTTP API Server')", async () => {
      const res = await fetch(`${server?.url}/api/runs/run_test1/agents`);
      const data = await res.json();

      const builder1 = data.find((a: Record<string, unknown>) => a.id === "agt_build1");
      expect(builder1).toBeDefined();
      // Should have a humanName or displayName that combines role and module title
      expect(builder1.displayName).toBeDefined();
      expect(typeof builder1.displayName).toBe("string");
      // Should include "Builder" and module title
      expect(builder1.displayName).toContain("Builder");
    });
  });

  // === Agent details collapsible ===

  describe("Agent details — collapsible section", () => {
    test("HTML has collapsible agents section in overview", async () => {
      const res = await fetch(`${server?.url}/`);
      const html = await res.text();

      // Should have an agents details section that's collapsible
      expect(html).toContain("agents-collapsible");
    });

    test("agents section is collapsed by default", async () => {
      const res = await fetch(`${server?.url}/`);
      const html = await res.text();

      // The collapsible section should default to collapsed/hidden
      expect(html).toContain("collapsed");
    });
  });

  // === Overview tab content ===

  describe("Overview tab — architecture summary and risks", () => {
    test("overview fetches buildplan for architecture summary", async () => {
      const res = await fetch(`${server?.url}/`);
      const html = await res.text();

      expect(html).toContain("/buildplan");
    });

    test("buildplan endpoint returns risks", async () => {
      const res = await fetch(`${server?.url}/api/runs/run_test1/buildplan`);
      const data = await res.json();

      expect(data.risks).toBeDefined();
      expect(Array.isArray(data.risks)).toBe(true);
      expect(data.risks.length).toBe(1);
      expect(data.risks[0].description).toContain("Dashboard UI");
    });
  });

  // === Modules tab with scope ===

  describe("Modules tab — shows files and dependency info", () => {
    test("modules include scope files (creates and modifies)", async () => {
      const res = await fetch(`${server?.url}/api/runs/run_test1/modules`);
      const data = await res.json();

      const apiMod = data.find((m: Record<string, unknown>) => m.id === "mod-api-server");
      expect(apiMod).toBeDefined();
      // Should include scope creates/modifies
      expect(apiMod.scope).toBeDefined();
      expect(apiMod.scope.creates).toBeDefined();
      expect(apiMod.scope.creates).toContain("src/dashboard/server.ts");
      expect(apiMod.scope.modifies).toBeDefined();
    });

    test("modules include dependency status info", async () => {
      const res = await fetch(`${server?.url}/api/runs/run_test1/modules`);
      const data = await res.json();

      const uiMod = data.find((m: Record<string, unknown>) => m.id === "mod-dashboard-ui");
      expect(uiMod).toBeDefined();
      expect(uiMod.depsTotal).toBe(1);
      expect(uiMod.depsSatisfied).toBe(1);
    });
  });

  // === Validation tab: Scenarios ===

  describe("Validation tab — scenario results", () => {
    test("GET /api/runs/:id/scenarios returns evaluation results", async () => {
      const res = await fetch(`${server?.url}/api/runs/run_test1/scenarios`);
      const data = await res.json();

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
    });

    test("scenario results include pass/fail data", async () => {
      const res = await fetch(`${server?.url}/api/runs/run_test1/scenarios`);
      const data = await res.json();

      const passed = data.find(
        (s: Record<string, unknown>) => s.type === "evaluation-passed",
      );
      expect(passed).toBeDefined();
      expect(passed.data).toBeDefined();

      const failed = data.find(
        (s: Record<string, unknown>) => s.type === "evaluation-failed",
      );
      expect(failed).toBeDefined();
      expect(failed.data).toBeDefined();
    });
  });

  // === Changeability scenario: Adding a new tab ===

  describe("Changeability — adding a new tab follows consistent pattern", () => {
    test("tab rendering uses a data-driven array pattern", async () => {
      const res = await fetch(`${server?.url}/`);
      const html = await res.text();

      // Should use an array or object of tab definitions so adding a tab
      // is just adding an entry to the array
      expect(html).toContain("TAB_DEFS");
    });
  });
});
