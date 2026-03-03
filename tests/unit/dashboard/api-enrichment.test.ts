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

  // Create specs with titles
  db.prepare(
    `INSERT INTO specs (id, title, status, file_path, content_hash, scenario_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "spec_test1",
    "Redesign dashboard around the workplan",
    "building",
    ".df/specs/spec_test1.md",
    "abc123",
    3,
    "2026-03-01T10:00:00Z",
    "2026-03-01T10:00:00Z",
  );

  db.prepare(
    `INSERT INTO specs (id, title, status, file_path, content_hash, scenario_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "spec_test2",
    "Require holdout scenarios before build",
    "completed",
    ".df/specs/spec_test2.md",
    "def456",
    2,
    "2026-03-01T09:00:00Z",
    "2026-03-01T09:00:00Z",
  );

  // Create runs referencing those specs
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

  // Create a run with a spec_id that does NOT exist in the specs table
  db.prepare(
    `INSERT INTO runs (id, spec_id, status, skip_change_eval, max_parallel, budget_usd, cost_usd, tokens_used, current_phase, iteration, max_iterations, config, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    "run_orphan",
    "spec_deleted",
    "failed",
    0,
    2,
    25.0,
    2.0,
    10000,
    "scout",
    0,
    3,
    "{}",
    "2026-03-01T09:00:00Z",
    "2026-03-01T09:10:00Z",
  );

  // Create architect agent for run_test1 (needed for buildplan FK)
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
}

let server: { port: number; url: string; stop: () => void } | null = null;
let db: InstanceType<typeof Database>;

describe("API Enrichment — EnrichedRunSummary Contract", () => {
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

  describe("GET /api/runs — specTitle enrichment", () => {
    test("run summaries include specTitle from specs table", async () => {
      const res = await fetch(`${server?.url}/api/runs`);
      expect(res.status).toBe(200);
      const data = await res.json();

      const run1 = data.find((r: Record<string, unknown>) => r.id === "run_test1");
      expect(run1).toBeDefined();
      expect(run1.specTitle).toBe("Redesign dashboard around the workplan");

      const run2 = data.find((r: Record<string, unknown>) => r.id === "run_test2");
      expect(run2).toBeDefined();
      expect(run2.specTitle).toBe("Require holdout scenarios before build");
    });

    test("specTitle falls back to specId when spec is not found in database", async () => {
      const res = await fetch(`${server?.url}/api/runs`);
      const data = await res.json();

      const orphan = data.find((r: Record<string, unknown>) => r.id === "run_orphan");
      expect(orphan).toBeDefined();
      expect(orphan.specTitle).toBe("spec_deleted");
    });
  });

  describe("GET /api/runs/:id — specTitle enrichment", () => {
    test("single run includes specTitle", async () => {
      const res = await fetch(`${server?.url}/api/runs/run_test1`);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.specTitle).toBe("Redesign dashboard around the workplan");
    });

    test("single run with missing spec falls back specTitle to specId", async () => {
      const res = await fetch(`${server?.url}/api/runs/run_orphan`);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.specTitle).toBe("spec_deleted");
    });
  });

  describe("GET /api/runs/:id/spec — SpecContentEndpoint Contract", () => {
    test("returns 404 for nonexistent run", async () => {
      const res = await fetch(`${server?.url}/api/runs/run_nonexistent/spec`);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    test("returns 404 when spec file does not exist on disk", async () => {
      // spec_test1 references .df/specs/spec_test1.md which doesn't exist on disk
      const res = await fetch(`${server?.url}/api/runs/run_test1/spec`);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    test("returns spec content with metadata when file exists", async () => {
      // Write a spec file to disk so the endpoint can read it
      const specContent = `---
id: spec_test1
title: Redesign dashboard around the workplan
type: feature
status: building
version: 0.1.0
priority: high
---

# Redesign dashboard around the workplan

## Goal

The dashboard should be workplan-centric.
`;
      const { mkdirSync, writeFileSync } = await import("node:fs");
      const { join } = await import("node:path");
      const tmpDir = await import("node:os").then((os) => os.tmpdir());
      const specDir = join(tmpDir, "df-test-specs");
      mkdirSync(specDir, { recursive: true });
      const specPath = join(specDir, "spec_test1.md");
      writeFileSync(specPath, specContent);

      // Update the spec record to point to our temp file
      db.prepare("UPDATE specs SET file_path = ? WHERE id = ?").run(specPath, "spec_test1");

      const res = await fetch(`${server?.url}/api/runs/run_test1/spec`);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.id).toBe("spec_test1");
      expect(data.title).toBe("Redesign dashboard around the workplan");
      expect(typeof data.content).toBe("string");
      expect(data.content).toContain("# Redesign dashboard around the workplan");
      expect(data.content).toContain("## Goal");

      // Clean up
      const { unlinkSync, rmdirSync } = await import("node:fs");
      unlinkSync(specPath);
      rmdirSync(specDir);
    });

    test("returns spec content body without frontmatter", async () => {
      const specContent = `---
id: spec_test1
title: Redesign dashboard around the workplan
type: feature
status: building
version: 0.1.0
priority: high
---

# Redesign dashboard around the workplan

Some body content here.
`;
      const { mkdirSync, writeFileSync } = await import("node:fs");
      const { join } = await import("node:path");
      const tmpDir = await import("node:os").then((os) => os.tmpdir());
      const specDir = join(tmpDir, "df-test-specs-2");
      mkdirSync(specDir, { recursive: true });
      const specPath = join(specDir, "spec_test1.md");
      writeFileSync(specPath, specContent);

      db.prepare("UPDATE specs SET file_path = ? WHERE id = ?").run(specPath, "spec_test1");

      const res = await fetch(`${server?.url}/api/runs/run_test1/spec`);
      expect(res.status).toBe(200);
      const data = await res.json();

      // Content should be the body (without frontmatter block)
      expect(data.content).not.toContain("---");
      expect(data.content).toContain("# Redesign dashboard around the workplan");
      expect(data.content).toContain("Some body content here.");

      // Clean up
      const { unlinkSync, rmdirSync } = await import("node:fs");
      unlinkSync(specPath);
      rmdirSync(specDir);
    });

    test("returns spec metadata fields", async () => {
      const specContent = `---
id: spec_test1
title: Redesign dashboard around the workplan
type: feature
status: building
version: 0.1.0
priority: high
---

# Redesign dashboard

Body.
`;
      const { mkdirSync, writeFileSync } = await import("node:fs");
      const { join } = await import("node:path");
      const tmpDir = await import("node:os").then((os) => os.tmpdir());
      const specDir = join(tmpDir, "df-test-specs-3");
      mkdirSync(specDir, { recursive: true });
      const specPath = join(specDir, "spec_test1.md");
      writeFileSync(specPath, specContent);

      db.prepare("UPDATE specs SET file_path = ? WHERE id = ?").run(specPath, "spec_test1");

      const res = await fetch(`${server?.url}/api/runs/run_test1/spec`);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data.id).toBe("spec_test1");
      expect(data.title).toBe("Redesign dashboard around the workplan");
      expect(data.type).toBe("feature");
      expect(data.status).toBe("building");
      expect(data.version).toBe("0.1.0");
      expect(data.priority).toBe("high");

      // Clean up
      const { unlinkSync, rmdirSync } = await import("node:fs");
      unlinkSync(specPath);
      rmdirSync(specDir);
    });

    test("returns 404 when run's spec_id has no matching spec record", async () => {
      const res = await fetch(`${server?.url}/api/runs/run_orphan/spec`);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });
  });
});
