import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { startServer, type ServerHandle } from "../../../src/dashboard/server.js";
import { SCHEMA_SQL } from "../../../src/db/schema.js";

const TEST_PORT = 18924;

function createTestDb(): InstanceType<typeof Database> {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  return db;
}

let server: ServerHandle;
let db: InstanceType<typeof Database>;
let tmpDir: string;

beforeEach(() => {
  db = createTestDb();
  tmpDir = join(import.meta.dir, "__tmp_spec_integration_test__");
  mkdirSync(join(tmpDir, "specs"), { recursive: true });
});

afterEach(() => {
  if (server) server.stop();
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
});

function seedSpec(id: string, title: string, status: string) {
  const filePath = join(tmpDir, "specs", `${id}.md`);
  const body = `---
id: ${id}
title: "${title}"
type: feature
status: ${status}
version: "0.1.0"
priority: medium
---

# ${title}

## Goal

Test goal.

## Requirements

- Requirement 1
`;
  writeFileSync(filePath, body);
  db.prepare(
    `INSERT INTO specs (id, title, status, file_path, content_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, '', ?, ?)`
  ).run(id, title, status, filePath, "2026-03-01T12:00:00Z", "2026-03-01T12:00:00Z");
}

describe("Spec Editor Integration", () => {
  describe("Create spec from dashboard (scenario: create-spec-from-dashboard)", () => {
    test("creates spec with correct frontmatter and sections", async () => {
      server = await startServer({ port: TEST_PORT, db, specsDir: join(tmpDir, "specs") });

      const res = await fetch(`${server.url}/api/specs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "Add a caching layer for the API responses" }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();

      // Verify file on disk
      const filePath = join(tmpDir, "specs", `${data.id}.md`);
      expect(existsSync(filePath)).toBe(true);

      const content = readFileSync(filePath, "utf-8");
      // Check frontmatter
      expect(content).toContain("type: feature");
      expect(content).toContain("status: draft");
      expect(content).toContain("version: 0.1.0");
      // Check sections
      expect(content).toContain("## Goal");
      expect(content).toContain("## Requirements");
      expect(content).toContain("## Scenarios");
      // Check goal populated from description
      expect(content).toContain("Add a caching layer for the API responses");
    });

    test("spec appears in GET /api/specs after creation", async () => {
      server = await startServer({ port: TEST_PORT, db, specsDir: join(tmpDir, "specs") });

      await fetch(`${server.url}/api/specs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "New feature" }),
      });

      const listRes = await fetch(`${server.url}/api/specs`);
      const specs = await listRes.json();
      expect(specs).toHaveLength(1);
      expect(specs[0].status).toBe("draft");
    });

    test("created spec opens in editor via GET /api/specs/:id", async () => {
      server = await startServer({ port: TEST_PORT, db, specsDir: join(tmpDir, "specs") });

      const createRes = await fetch(`${server.url}/api/specs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "Implement user search" }),
      });
      const { id } = await createRes.json();

      const getRes = await fetch(`${server.url}/api/specs/${id}`);
      expect(getRes.status).toBe(200);
      const specData = await getRes.json();
      expect(specData.content).toContain("Implement user search");
      expect(specData.status).toBe("draft");
    });
  });

  describe("Edit draft spec (scenario: edit-draft-spec)", () => {
    test("PUT /api/specs/:id updates file on disk and maintains frontmatter", async () => {
      seedSpec("spec_e1", "Editable", "draft");
      server = await startServer({ port: TEST_PORT, db });

      const newContent = "# Updated Title\n\n## Goal\n\nNew goal.\n\n## Requirements\n\n- Support cache invalidation via TTL headers\n";
      const res = await fetch(`${server.url}/api/specs/spec_e1`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent }),
      });
      expect(res.status).toBe(200);

      // Verify file on disk preserves frontmatter
      const filePath = join(tmpDir, "specs", "spec_e1.md");
      const fileContent = readFileSync(filePath, "utf-8");
      expect(fileContent).toContain("id: spec_e1");
      expect(fileContent).toContain("Support cache invalidation via TTL headers");
    });

    test("GET after PUT returns updated content", async () => {
      seedSpec("spec_e2", "Another Editable", "draft");
      server = await startServer({ port: TEST_PORT, db });

      await fetch(`${server.url}/api/specs/spec_e2`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "# Modified\n\nNew content here." }),
      });

      const getRes = await fetch(`${server.url}/api/specs/spec_e2`);
      const data = await getRes.json();
      expect(data.content).toContain("New content here.");
    });

    test("spec with only failed runs remains editable", async () => {
      seedSpec("spec_failed_runs", "Failed Runs Spec", "draft");
      // Add a failed run
      db.prepare(
        `INSERT INTO runs (id, spec_id, status, skip_change_eval, max_parallel, budget_usd, cost_usd, tokens_used, iteration, max_iterations, config, created_at, updated_at)
         VALUES (?, ?, 'failed', 0, 4, 50.0, 0.0, 0, 0, 3, '{}', ?, ?)`
      ).run("run_f1", "spec_failed_runs", "2026-03-01T12:00:00Z", "2026-03-01T12:30:00Z");

      server = await startServer({ port: TEST_PORT, db });

      const res = await fetch(`${server.url}/api/specs/spec_failed_runs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "# Still editable" }),
      });
      expect(res.status).toBe(200);
    });
  });

  describe("Cannot edit completed spec (scenario: cannot-edit-completed-spec)", () => {
    test("PUT returns 403 for completed spec", async () => {
      seedSpec("spec_completed", "Completed Spec", "completed");
      server = await startServer({ port: TEST_PORT, db });

      const res = await fetch(`${server.url}/api/specs/spec_completed`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "# Trying to hack" }),
      });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("completed");
    });
  });

  describe("Build from dashboard (scenario: build-from-dashboard)", () => {
    test("POST /api/builds creates run and updates spec status", async () => {
      seedSpec("spec_b1", "Buildable", "draft");
      server = await startServer({ port: TEST_PORT, db, specsDir: join(tmpDir, "specs") });

      const res = await fetch(`${server.url}/api/builds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specId: "spec_b1" }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.runId).toMatch(/^run_/);
      expect(data.specId).toBe("spec_b1");

      // Verify run in DB
      const run = db.prepare("SELECT * FROM runs WHERE id = ?").get(data.runId) as any;
      expect(run).toBeTruthy();
      expect(run.spec_id).toBe("spec_b1");
      expect(run.status).toBe("pending");

      // Verify spec status changed to building
      const spec = db.prepare("SELECT * FROM specs WHERE id = 'spec_b1'").get() as any;
      expect(spec.status).toBe("building");
    });

    test("error shown inline when build fails to start (spec not found)", async () => {
      server = await startServer({ port: TEST_PORT, db, specsDir: join(tmpDir, "specs") });

      const res = await fetch(`${server.url}/api/builds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specId: "nonexistent" }),
      });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBeTruthy();
    });
  });

  describe("Build button disabled during active build (scenario: build-button-disabled-during-active-build)", () => {
    test("POST /api/builds returns 409 for building spec", async () => {
      seedSpec("spec_active", "Active Build", "building");
      server = await startServer({ port: TEST_PORT, db, specsDir: join(tmpDir, "specs") });

      const res = await fetch(`${server.url}/api/builds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specId: "spec_active" }),
      });
      expect(res.status).toBe(409);
    });

    test("POST /api/builds returns 409 for completed spec", async () => {
      seedSpec("spec_done", "Done Spec", "completed");
      server = await startServer({ port: TEST_PORT, db, specsDir: join(tmpDir, "specs") });

      const res = await fetch(`${server.url}/api/builds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specId: "spec_done" }),
      });
      expect(res.status).toBe(409);
    });
  });

  describe("Spec list grouped by status (scenario: spec-list-grouped-by-status)", () => {
    test("GET /api/specs returns specs with status for grouping", async () => {
      seedSpec("spec_d1", "Draft One", "draft");
      seedSpec("spec_b1", "Building One", "building");
      seedSpec("spec_c1", "Complete One", "completed");
      server = await startServer({ port: TEST_PORT, db });

      const res = await fetch(`${server.url}/api/specs`);
      const specs = await res.json();
      expect(specs).toHaveLength(3);

      const statuses = specs.map((s: any) => s.status);
      expect(statuses).toContain("draft");
      expect(statuses).toContain("building");
      expect(statuses).toContain("completed");

      // Each spec has required fields
      for (const spec of specs) {
        expect(spec.id).toBeTruthy();
        expect(spec.title).toBeTruthy();
        expect(spec.status).toBeTruthy();
        expect(spec.lastModified).toBeTruthy();
      }
    });
  });
});
