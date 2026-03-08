import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { existsSync, readFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { SCHEMA_SQL } from "../../../src/db/schema.js";
import { startServer, type ServerHandle } from "../../../src/dashboard/server.js";
import { parseFrontmatter } from "../../../src/utils/frontmatter.js";
import { tmpdir } from "node:os";

// --- Test helpers ---

function createTestDb(): InstanceType<typeof Database> {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA_SQL);
  return db;
}

function now(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function insertSpec(
  db: InstanceType<typeof Database>,
  id: string,
  title: string,
  filePath: string,
  status = "draft",
) {
  const ts = now();
  db.prepare(
    `INSERT INTO specs (id, title, status, file_path, content_hash, scenario_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, '', 0, ?, ?)`,
  ).run(id, title, status, filePath, ts, ts);
}

function insertRun(
  db: InstanceType<typeof Database>,
  id: string,
  specId: string,
  status = "pending",
) {
  const ts = now();
  db.prepare(
    `INSERT INTO runs (id, spec_id, status, skip_change_eval, max_parallel, budget_usd, max_iterations, config, created_at, updated_at)
     VALUES (?, ?, ?, 0, 4, 50.0, 3, '{}', ?, ?)`,
  ).run(id, specId, status, ts, ts);
}

// --- Tests ---

describe("Spec API Endpoints", () => {
  let db: InstanceType<typeof Database>;
  let server: ServerHandle;
  let tempDir: string;

  beforeEach(async () => {
    db = createTestDb();
    tempDir = join(tmpdir(), `spec-api-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(join(tempDir, ".df", "specs"), { recursive: true });
    server = await startServer({ port: 0, db });
  });

  afterEach(() => {
    server.stop();
    db.close();
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ============================================================
  // GET /api/specs — list all specs
  // ============================================================

  describe("GET /api/specs", () => {
    test("returns empty array when no specs exist", async () => {
      const res = await fetch(`${server.url}/api/specs`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual([]);
    });

    test("returns all specs with correct fields", async () => {
      insertSpec(db, "spec_001", "First spec", "specs/spec_001.md", "draft");
      insertSpec(db, "spec_002", "Second spec", "specs/spec_002.md", "building");
      insertSpec(db, "spec_003", "Third spec", "specs/spec_003.md", "completed");

      const res = await fetch(`${server.url}/api/specs`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveLength(3);

      // Specs returned in descending order of creation
      for (const spec of data) {
        expect(spec).toHaveProperty("id");
        expect(spec).toHaveProperty("title");
        expect(spec).toHaveProperty("status");
        expect(spec).toHaveProperty("lastModified");
        expect(spec).toHaveProperty("createdAt");
      }
    });
  });

  // ============================================================
  // GET /api/specs/:id — spec detail
  // ============================================================

  describe("GET /api/specs/:id", () => {
    test("returns 404 for non-existent spec", async () => {
      const res = await fetch(`${server.url}/api/specs/spec_nonexistent`);
      expect(res.status).toBe(404);
    });

    test("returns spec detail with content and isLocked for draft spec", async () => {
      const specId = "spec_detail_test";
      const specFile = join(tempDir, ".df", "specs", `${specId}.md`);
      const content = `---
id: ${specId}
title: Detail Test
type: feature
status: draft
---

# Detail Test

## Goal

Test goal content.
`;
      const { writeFileSync } = await import("node:fs");
      writeFileSync(specFile, content);
      insertSpec(db, specId, "Detail Test", specFile, "draft");

      const res = await fetch(`${server.url}/api/specs/${specId}`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe(specId);
      expect(data.title).toBe("Detail Test");
      expect(data.isLocked).toBe(false);
      expect(data.content).toContain("Test goal content");
    });

    test("returns isLocked=true for spec with completed run", async () => {
      const specId = "spec_locked_test";
      const specFile = join(tempDir, ".df", "specs", `${specId}.md`);
      const content = `---
id: ${specId}
title: Locked Test
type: feature
status: completed
---

# Locked Test
`;
      const { writeFileSync } = await import("node:fs");
      writeFileSync(specFile, content);
      insertSpec(db, specId, "Locked Test", specFile, "completed");
      insertRun(db, "run_completed_1", specId, "completed");

      const res = await fetch(`${server.url}/api/specs/${specId}`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.isLocked).toBe(true);
    });
  });

  // ============================================================
  // POST /api/specs — create spec from description
  // ============================================================

  describe("POST /api/specs", () => {
    test("returns 400 for missing description", async () => {
      const res = await fetch(`${server.url}/api/specs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    test("returns 400 for empty description", async () => {
      const res = await fetch(`${server.url}/api/specs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "   " }),
      });
      expect(res.status).toBe(400);
    });

    test("creates spec from description and returns 201", async () => {
      const res = await fetch(`${server.url}/api/specs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: "Add a caching layer for the API responses",
        }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.id).toMatch(/^spec_/);
      expect(data.title).toBeTruthy();
      expect(data.status).toBe("draft");
      expect(data.content).toContain("caching layer");

      // Verify it's in the database
      const specRow = db.prepare("SELECT * FROM specs WHERE id = ?").get(data.id);
      expect(specRow).toBeTruthy();
    });

    test("creates spec file on disk", async () => {
      const res = await fetch(`${server.url}/api/specs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: "Implement user authentication with JWT tokens",
        }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.filePath).toBeTruthy();
      // File should exist at filePath
      expect(existsSync(data.filePath)).toBe(true);

      // File content should have frontmatter
      const fileContent = readFileSync(data.filePath, "utf-8");
      const { data: fm } = parseFrontmatter(fileContent);
      expect(fm.id).toBe(data.id);
      expect(fm.status).toBe("draft");
    });
  });

  // ============================================================
  // PUT /api/specs/:id — update spec content
  // ============================================================

  describe("PUT /api/specs/:id", () => {
    test("returns 404 for non-existent spec", async () => {
      const res = await fetch(`${server.url}/api/specs/spec_nonexistent`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "new content" }),
      });
      expect(res.status).toBe(404);
    });

    test("returns 403 when updating a locked spec", async () => {
      const specId = "spec_update_locked";
      const specFile = join(tempDir, ".df", "specs", `${specId}.md`);
      const { writeFileSync } = await import("node:fs");
      writeFileSync(specFile, `---\nid: ${specId}\ntitle: Locked\nstatus: completed\n---\n\n# Locked`);
      insertSpec(db, specId, "Locked", specFile, "completed");
      insertRun(db, "run_lock_1", specId, "completed");

      const res = await fetch(`${server.url}/api/specs/${specId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Updated content" }),
      });
      expect(res.status).toBe(403);
    });

    test("updates draft spec content successfully", async () => {
      const specId = "spec_update_draft";
      const specFile = join(tempDir, ".df", "specs", `${specId}.md`);
      const { writeFileSync } = await import("node:fs");
      writeFileSync(specFile, `---\nid: ${specId}\ntitle: Draft Spec\nstatus: draft\n---\n\n# Original content`);
      insertSpec(db, specId, "Draft Spec", specFile, "draft");

      const newContent = "# Updated content\n\n## Goal\n\nNew goal here.";
      const res = await fetch(`${server.url}/api/specs/${specId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.content).toContain("Updated content");

      // Verify file on disk was updated
      const fileContent = readFileSync(specFile, "utf-8");
      expect(fileContent).toContain("Updated content");
    });
  });

  // ============================================================
  // POST /api/builds — start build for a spec
  // ============================================================

  describe("POST /api/builds", () => {
    test("returns 400 for missing specId", async () => {
      const res = await fetch(`${server.url}/api/builds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    test("returns 404 for non-existent spec", async () => {
      const res = await fetch(`${server.url}/api/builds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specId: "spec_nonexistent" }),
      });
      expect(res.status).toBe(404);
    });

    test("creates a run and returns 201", async () => {
      insertSpec(db, "spec_build_1", "Build Test", "specs/spec_build_1.md", "draft");

      const res = await fetch(`${server.url}/api/builds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specId: "spec_build_1" }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.runId).toMatch(/^run_/);
      expect(data.specId).toBe("spec_build_1");
      expect(data.status).toBe("pending");

      // Verify run in database
      const runRow = db.prepare("SELECT * FROM runs WHERE id = ?").get(data.runId);
      expect(runRow).toBeTruthy();
    });

    test("returns 409 when spec already has an active build", async () => {
      insertSpec(db, "spec_active_build", "Active Build", "specs/spec_active.md", "building");
      insertRun(db, "run_active_1", "spec_active_build", "running");

      const res = await fetch(`${server.url}/api/builds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specId: "spec_active_build" }),
      });
      expect(res.status).toBe(409);
    });
  });

  // ============================================================
  // GET /api/specs/:id/runs — list runs for a spec
  // ============================================================

  describe("GET /api/specs/:id/runs", () => {
    test("returns 404 for non-existent spec", async () => {
      const res = await fetch(`${server.url}/api/specs/spec_nonexistent/runs`);
      expect(res.status).toBe(404);
    });

    test("returns empty array when no runs exist for spec", async () => {
      insertSpec(db, "spec_no_runs", "No Runs", "specs/spec_no_runs.md");

      const res = await fetch(`${server.url}/api/specs/spec_no_runs/runs`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual([]);
    });

    test("returns runs for spec", async () => {
      insertSpec(db, "spec_with_runs", "With Runs", "specs/spec_with_runs.md");
      insertRun(db, "run_1", "spec_with_runs", "completed");
      insertRun(db, "run_2", "spec_with_runs", "running");

      const res = await fetch(`${server.url}/api/specs/spec_with_runs/runs`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveLength(2);
      expect(data[0]).toHaveProperty("id");
      expect(data[0]).toHaveProperty("status");
    });
  });

  // ============================================================
  // CORS support for new methods
  // ============================================================

  describe("CORS", () => {
    test("OPTIONS returns correct methods including POST and PUT", async () => {
      const res = await fetch(`${server.url}/api/specs`, { method: "OPTIONS" });
      expect(res.status).toBe(204);
      const allow = res.headers.get("Access-Control-Allow-Methods");
      expect(allow).toContain("POST");
      expect(allow).toContain("PUT");
    });
  });
});
