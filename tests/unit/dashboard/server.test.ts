import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { startServer } from "../../../src/dashboard/server.js";
import { SCHEMA_SQL } from "../../../src/db/schema.js";

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

  // Create a run
  db.prepare(
    `INSERT INTO runs (id, spec_id, status, mode, max_parallel, budget_usd, cost_usd, tokens_used, current_phase, iteration, max_iterations, config, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "run_test1",
    "spec_test1",
    "running",
    "thorough",
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

  // Create a completed run
  db.prepare(
    `INSERT INTO runs (id, spec_id, status, mode, max_parallel, budget_usd, cost_usd, tokens_used, current_phase, iteration, max_iterations, config, error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "run_test2",
    "spec_test2",
    "completed",
    "quick",
    2,
    25.0,
    8.0,
    90000,
    "merge",
    0,
    3,
    "{}",
    null,
    "2026-03-01T10:00:00Z",
    "2026-03-01T10:30:00Z",
  );

  // Create architect agent (no buildplan_id FK needed)
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

  // Create a buildplan for run_test1 (must be before builder agents that reference it)
  const planJson = JSON.stringify({
    spec_id: "spec_test1",
    modules: [
      {
        id: "mod-api-server",
        title: "HTTP API Server",
        description: "Bun HTTP server with JSON API endpoints",
        scope: {
          creates: ["src/dashboard/server.ts"],
          modifies: [],
          test_files: ["tests/unit/dashboard/"],
        },
        estimated_complexity: "medium",
        estimated_tokens: 80000,
        estimated_duration_min: 15,
      },
      {
        id: "mod-dashboard-ui",
        title: "Dashboard UI",
        description: "Single HTML page with inline CSS/JS",
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
    risks: [],
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

  // Create builder agents (after buildplan so FK is satisfied)
  db.prepare(
    `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, buildplan_id, tdd_phase, tdd_cycles, cost_usd, tokens_used, queue_wait_ms, total_active_ms, error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "agt_build1",
    "run_test1",
    "builder",
    "builder-api",
    "running",
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
    now,
  );

  db.prepare(
    `INSERT INTO agents (id, run_id, role, name, status, pid, module_id, buildplan_id, tdd_phase, tdd_cycles, cost_usd, tokens_used, queue_wait_ms, total_active_ms, error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "agt_build2",
    "run_test1",
    "builder",
    "builder-ui",
    "pending",
    null,
    "mod-dashboard-ui",
    "plan_test1",
    null,
    0,
    0,
    0,
    0,
    0,
    null,
    "2026-03-01T11:05:00Z",
    now,
  );

  // Create events for run_test1
  db.prepare(
    "INSERT INTO events (id, run_id, agent_id, type, data, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(
    "evt_1",
    "run_test1",
    null,
    "run-started",
    '{"spec_id":"spec_test1"}',
    "2026-03-01T11:00:00Z",
  );

  db.prepare(
    "INSERT INTO events (id, run_id, agent_id, type, data, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(
    "evt_2",
    "run_test1",
    "agt_arch1",
    "agent-spawned",
    '{"role":"architect"}',
    "2026-03-01T11:00:30Z",
  );

  db.prepare(
    "INSERT INTO events (id, run_id, agent_id, type, data, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run("evt_3", "run_test1", "agt_arch1", "agent-completed", null, "2026-03-01T11:05:00Z");

  // Create contracts for run_test1
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
    "consumer",
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
    0,
    null,
    "2026-03-01T11:05:00Z",
  );
}

let server: { port: number; url: string; stop: () => void } | null = null;
let db: InstanceType<typeof Database>;

describe("Dashboard Server", () => {
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
  });

  describe("Server lifecycle", () => {
    test("starts on a random port when port=0", () => {
      expect(server).not.toBeNull();
      expect(server?.port).toBeGreaterThan(0);
      expect(server?.url).toContain("http://localhost:");
    });

    test("stop() shuts down the server", async () => {
      const url = server?.url;
      server?.stop();
      try {
        await fetch(`${url}/api/runs`);
        expect(true).toBe(false); // should not reach
      } catch {
        expect(true).toBe(true); // connection refused
      }
      server = null; // prevent afterEach from double-stopping
    });
  });

  describe("GET /api/runs", () => {
    test("returns array of RunSummary objects", async () => {
      const res = await fetch(`${server?.url}/api/runs`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/json");

      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
    });

    test("RunSummary has correct fields per contract", async () => {
      const res = await fetch(`${server?.url}/api/runs`);
      const data = await res.json();
      const run = data.find((r: Record<string, unknown>) => r.id === "run_test1");

      expect(run).toBeDefined();
      expect(run.id).toBe("run_test1");
      expect(run.specId).toBe("spec_test1");
      expect(run.status).toBe("running");
      expect(run.phase).toBe("build");
      expect(run.cost).toBe(12.5);
      expect(run.budget).toBe(50.0);
      expect(typeof run.elapsed).toBe("string");
      expect(run.moduleCount).toBe(2);
      expect(run.completedCount).toBeGreaterThanOrEqual(0);
      expect(run.tokensUsed).toBe(150000);
      expect(typeof run.createdAt).toBe("string");
    });

    test("runs are ordered by created_at descending", async () => {
      const res = await fetch(`${server?.url}/api/runs`);
      const data = await res.json();
      // run_test1 created at 11:00, run_test2 at 10:00
      expect(data[0].id).toBe("run_test1");
      expect(data[1].id).toBe("run_test2");
    });
  });

  describe("GET /api/runs/:id", () => {
    test("returns single RunSummary for valid id", async () => {
      const res = await fetch(`${server?.url}/api/runs/run_test1`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/json");

      const data = await res.json();
      expect(data.id).toBe("run_test1");
      expect(data.specId).toBe("spec_test1");
      expect(data.status).toBe("running");
    });

    test("returns 404 for nonexistent run", async () => {
      const res = await fetch(`${server?.url}/api/runs/run_nonexistent`);
      expect(res.status).toBe(404);

      const data = await res.json();
      expect(data.error).toBeDefined();
      expect(typeof data.error).toBe("string");
    });
  });

  describe("GET /api/runs/:id/agents", () => {
    test("returns array of AgentSummary objects", async () => {
      const res = await fetch(`${server?.url}/api/runs/run_test1/agents`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/json");

      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(3);
    });

    test("AgentSummary has correct fields per contract", async () => {
      const res = await fetch(`${server?.url}/api/runs/run_test1/agents`);
      const data = await res.json();
      const builder = data.find((a: Record<string, unknown>) => a.id === "agt_build1");

      expect(builder).toBeDefined();
      expect(builder.id).toBe("agt_build1");
      expect(builder.role).toBe("builder");
      expect(builder.name).toBe("builder-api");
      expect(builder.status).toBe("running");
      expect(builder.pid).toBe(5678);
      expect(builder.cost).toBe(5.0);
      expect(builder.tokens).toBe(60000);
      expect(typeof builder.elapsed).toBe("string");
      expect(builder.moduleId).toBe("mod-api-server");
      expect(builder.tddPhase).toBe("green");
      expect(builder.tddCycles).toBe(3);
    });

    test("returns 404 for nonexistent run", async () => {
      const res = await fetch(`${server?.url}/api/runs/run_nonexistent/agents`);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });
  });

  describe("GET /api/runs/:id/buildplan", () => {
    test("returns buildplan detail", async () => {
      const res = await fetch(`${server?.url}/api/runs/run_test1/buildplan`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/json");

      const data = await res.json();
      expect(data.id).toBe("plan_test1");
      expect(data.modules).toBeDefined();
      expect(Array.isArray(data.modules)).toBe(true);
      expect(data.modules.length).toBe(2);
      expect(data.contracts).toBeDefined();
      expect(data.dependencies).toBeDefined();
    });

    test("returns 404 for run with no buildplan", async () => {
      const res = await fetch(`${server?.url}/api/runs/run_test2/buildplan`);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    test("returns 404 for nonexistent run", async () => {
      const res = await fetch(`${server?.url}/api/runs/run_nonexistent/buildplan`);
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/runs/:id/events", () => {
    test("returns array of EventRecord objects", async () => {
      const res = await fetch(`${server?.url}/api/runs/run_test1/events`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/json");

      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(3);
    });

    test("events have correct shape", async () => {
      const res = await fetch(`${server?.url}/api/runs/run_test1/events`);
      const data = await res.json();
      const evt = data.find((e: Record<string, unknown>) => e.id === "evt_1");

      expect(evt).toBeDefined();
      expect(evt.type).toBe("run-started");
      expect(evt.createdAt).toBeDefined();
    });

    test("returns 404 for nonexistent run", async () => {
      const res = await fetch(`${server?.url}/api/runs/run_nonexistent/events`);
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/runs/:id/scenarios", () => {
    test("returns empty array when no scenarios exist", async () => {
      const res = await fetch(`${server?.url}/api/runs/run_test1/scenarios`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });

    test("returns 404 for nonexistent run", async () => {
      const res = await fetch(`${server?.url}/api/runs/run_nonexistent/scenarios`);
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/runs/:id/modules", () => {
    test("returns array of ModuleStatus objects", async () => {
      const res = await fetch(`${server?.url}/api/runs/run_test1/modules`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("application/json");

      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(2);
    });

    test("ModuleStatus has correct fields per contract", async () => {
      const res = await fetch(`${server?.url}/api/runs/run_test1/modules`);
      const data = await res.json();
      const mod = data.find((m: Record<string, unknown>) => m.id === "mod-api-server");

      expect(mod).toBeDefined();
      expect(mod.id).toBe("mod-api-server");
      expect(mod.title).toBe("HTTP API Server");
      expect(typeof mod.description).toBe("string");
      expect(mod.agentStatus).toBe("running");
      expect(mod.tddPhase).toBe("green");
      expect(mod.tddCycles).toBe(3);
      expect(typeof mod.filesChanged).toBe("number");
      expect(mod.cost).toBe(5.0);
      expect(mod.tokens).toBe(60000);
      expect(typeof mod.contractsAcknowledged).toBe("number");
      expect(typeof mod.contractsTotal).toBe("number");
      expect(typeof mod.depsSatisfied).toBe("number");
      expect(typeof mod.depsTotal).toBe("number");
    });

    test("returns 404 for nonexistent run", async () => {
      const res = await fetch(`${server?.url}/api/runs/run_nonexistent/modules`);
      expect(res.status).toBe(404);
    });
  });

  describe("GET / (HTML)", () => {
    test("serves HTML at root", async () => {
      const res = await fetch(`${server?.url}/`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/html");

      const html = await res.text();
      expect(html).toContain("<!DOCTYPE html>");
    });
  });

  describe("CORS headers", () => {
    test("API responses include CORS headers", async () => {
      const res = await fetch(`${server?.url}/api/runs`);
      expect(res.headers.get("access-control-allow-origin")).toBe("*");
    });
  });

  describe("Error handling", () => {
    test("unknown API routes return 404", async () => {
      const res = await fetch(`${server?.url}/api/unknown`);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });
  });

  describe("Empty database", () => {
    test("returns empty array when no runs exist", async () => {
      // Use a fresh empty DB
      if (server) server.stop();
      const emptyDb = createTestDb();
      server = await startServer({ port: 0, db: emptyDb });

      const res = await fetch(`${server?.url}/api/runs`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);

      server.stop();
      server = null;
      emptyDb.close();

      // Re-create for afterEach
      db = createTestDb();
      seedTestData(db);
      server = await startServer({ port: 0, db });
    });
  });
});
