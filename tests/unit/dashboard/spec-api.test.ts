import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { startServer, type ServerHandle } from "../../../src/dashboard/server.js";
import { SCHEMA_SQL } from "../../../src/db/schema.js";

const TEST_PORT = 18923;

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
  tmpDir = join(import.meta.dir, "__tmp_spec_api_test__");
  mkdirSync(join(tmpDir, "specs"), { recursive: true });
});

afterEach(() => {
  if (server) server.stop();
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
});

function seedSpec(id: string, title: string, status: string, content?: string) {
  const filePath = join(tmpDir, "specs", `${id}.md`);
  const body = content ?? `---
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

describe("Spec API Endpoints", () => {
  describe("GET /api/specs", () => {
    test("returns empty array when no specs exist", async () => {
      server = await startServer({ port: TEST_PORT, db });
      const res = await fetch(`${server.url}/api/specs`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual([]);
    });

    test("returns all specs with status, title, last modified", async () => {
      seedSpec("spec_1", "First Spec", "draft");
      seedSpec("spec_2", "Second Spec", "building");
      seedSpec("spec_3", "Third Spec", "completed");
      server = await startServer({ port: TEST_PORT, db });

      const res = await fetch(`${server.url}/api/specs`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveLength(3);

      // Each spec should have id, title, status, lastModified
      for (const spec of data) {
        expect(spec).toHaveProperty("id");
        expect(spec).toHaveProperty("title");
        expect(spec).toHaveProperty("status");
        expect(spec).toHaveProperty("lastModified");
      }
    });

    test("specs are grouped-ready (have status field)", async () => {
      seedSpec("spec_d", "Draft One", "draft");
      seedSpec("spec_b", "Building One", "building");
      seedSpec("spec_c", "Complete One", "completed");
      server = await startServer({ port: TEST_PORT, db });

      const res = await fetch(`${server.url}/api/specs`);
      const data = await res.json();
      const statuses = data.map((s: any) => s.status);
      expect(statuses).toContain("draft");
      expect(statuses).toContain("building");
      expect(statuses).toContain("completed");
    });
  });

  describe("GET /api/specs/:id", () => {
    test("returns full spec content with parsed frontmatter", async () => {
      seedSpec("spec_full", "Full Spec", "draft");
      server = await startServer({ port: TEST_PORT, db });

      const res = await fetch(`${server.url}/api/specs/spec_full`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe("spec_full");
      expect(data.title).toBe("Full Spec");
      expect(data.status).toBe("draft");
      expect(data.content).toContain("# Full Spec");
      expect(data.content).toContain("## Goal");
    });

    test("returns 404 for non-existent spec", async () => {
      server = await startServer({ port: TEST_PORT, db });
      const res = await fetch(`${server.url}/api/specs/nonexistent`);
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/specs", () => {
    test("creates a new spec from a description string", async () => {
      server = await startServer({ port: TEST_PORT, db, specsDir: join(tmpDir, "specs") });

      const res = await fetch(`${server.url}/api/specs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "Add a caching layer for the API responses" }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toHaveProperty("id");
      expect(data.id).toMatch(/^spec_/);
      expect(data).toHaveProperty("title");
      expect(data.status).toBe("draft");

      // Verify spec exists in DB
      const specRow = db.prepare("SELECT * FROM specs WHERE id = ?").get(data.id);
      expect(specRow).toBeTruthy();
    });

    test("returns 400 when description is missing", async () => {
      server = await startServer({ port: TEST_PORT, db, specsDir: join(tmpDir, "specs") });

      const res = await fetch(`${server.url}/api/specs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api/specs/:id", () => {
    test("updates spec markdown content", async () => {
      seedSpec("spec_edit", "Editable Spec", "draft");
      server = await startServer({ port: TEST_PORT, db });

      const newContent = "# Updated Spec\n\n## Goal\n\nUpdated goal.\n";
      const res = await fetch(`${server.url}/api/specs/spec_edit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent }),
      });
      expect(res.status).toBe(200);

      // Verify file on disk was updated
      const filePath = join(tmpDir, "specs", "spec_edit.md");
      const fileContent = await Bun.file(filePath).text();
      expect(fileContent).toContain("Updated goal.");
    });

    test("returns 403 for completed spec", async () => {
      seedSpec("spec_locked", "Locked Spec", "completed");
      server = await startServer({ port: TEST_PORT, db });

      const res = await fetch(`${server.url}/api/specs/spec_locked`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "# Hacked" }),
      });
      expect(res.status).toBe(403);
    });

    test("returns 404 for non-existent spec", async () => {
      server = await startServer({ port: TEST_PORT, db });

      const res = await fetch(`${server.url}/api/specs/nonexistent`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "# Nope" }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/builds", () => {
    test("creates a build run for a spec", async () => {
      seedSpec("spec_buildable", "Buildable Spec", "draft");
      server = await startServer({ port: TEST_PORT, db, specsDir: join(tmpDir, "specs") });

      const res = await fetch(`${server.url}/api/builds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specId: "spec_buildable" }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toHaveProperty("runId");
      expect(data.runId).toMatch(/^run_/);

      // Verify run exists in DB
      const runRow = db.prepare("SELECT * FROM runs WHERE id = ?").get(data.runId);
      expect(runRow).toBeTruthy();
    });

    test("returns 400 when specId is missing", async () => {
      server = await startServer({ port: TEST_PORT, db, specsDir: join(tmpDir, "specs") });

      const res = await fetch(`${server.url}/api/builds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    test("returns 404 for non-existent spec", async () => {
      server = await startServer({ port: TEST_PORT, db, specsDir: join(tmpDir, "specs") });

      const res = await fetch(`${server.url}/api/builds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specId: "spec_nonexistent" }),
      });
      expect(res.status).toBe(404);
    });

    test("returns 409 when spec is already building", async () => {
      seedSpec("spec_building", "Building Spec", "building");
      server = await startServer({ port: TEST_PORT, db, specsDir: join(tmpDir, "specs") });

      const res = await fetch(`${server.url}/api/builds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specId: "spec_building" }),
      });
      expect(res.status).toBe(409);
    });
  });

  describe("GET /api/specs/:id/runs", () => {
    test("returns runs for a spec", async () => {
      seedSpec("spec_with_runs", "Spec With Runs", "draft");
      // Create a run linked to this spec
      db.prepare(
        `INSERT INTO runs (id, spec_id, status, skip_change_eval, max_parallel, budget_usd, cost_usd, tokens_used, iteration, max_iterations, config, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run("run_r1", "spec_with_runs", "completed", 0, 4, 50.0, 5.0, 10000, 0, 3, "{}", "2026-03-01T12:00:00Z", "2026-03-01T12:30:00Z");

      server = await startServer({ port: TEST_PORT, db });

      const res = await fetch(`${server.url}/api/specs/spec_with_runs/runs`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe("run_r1");
      expect(data[0].specId).toBe("spec_with_runs");
    });

    test("returns empty array for spec with no runs", async () => {
      seedSpec("spec_no_runs", "No Runs Spec", "draft");
      server = await startServer({ port: TEST_PORT, db });

      const res = await fetch(`${server.url}/api/specs/spec_no_runs/runs`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual([]);
    });
  });
});
