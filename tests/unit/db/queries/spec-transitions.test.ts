import { describe, test, expect, beforeEach } from "bun:test";
import { getDbForTest } from "../../../../src/db/index.js";
import {
  createSpec,
  getSpec,
  updateSpecStatus,
} from "../../../../src/db/queries/specs.js";
import {
  transitionSpecStatus,
  isValidTransition,
  VALID_TRANSITIONS,
} from "../../../../src/db/queries/spec-transitions.js";
import type { SqliteDb } from "../../../../src/db/index.js";
import type { SpecStatus } from "../../../../src/types/spec.js";

let db: SqliteDb;

beforeEach(() => {
  db = getDbForTest();
});

describe("spec status transitions", () => {
  describe("VALID_TRANSITIONS", () => {
    test("defines allowed transitions from each status", () => {
      expect(VALID_TRANSITIONS).toBeDefined();
      // draft can go to building
      expect(VALID_TRANSITIONS.draft).toContain("building");
      // building can go to completed or back to draft (on failure)
      expect(VALID_TRANSITIONS.building).toContain("completed");
      expect(VALID_TRANSITIONS.building).toContain("draft");
      // any status can go to archived
      expect(VALID_TRANSITIONS.draft).toContain("archived");
      expect(VALID_TRANSITIONS.building).toContain("archived");
      expect(VALID_TRANSITIONS.completed).toContain("archived");
      // completed cannot go back to draft or building
      expect(VALID_TRANSITIONS.completed).not.toContain("draft");
      expect(VALID_TRANSITIONS.completed).not.toContain("building");
    });
  });

  describe("isValidTransition", () => {
    test("returns true for draft → building", () => {
      expect(isValidTransition("draft", "building")).toBe(true);
    });

    test("returns true for building → completed", () => {
      expect(isValidTransition("building", "completed")).toBe(true);
    });

    test("returns true for building → draft (failure rollback)", () => {
      expect(isValidTransition("building", "draft")).toBe(true);
    });

    test("returns true for any status → archived", () => {
      expect(isValidTransition("draft", "archived")).toBe(true);
      expect(isValidTransition("building", "archived")).toBe(true);
      expect(isValidTransition("completed", "archived")).toBe(true);
    });

    test("returns false for completed → draft", () => {
      expect(isValidTransition("completed", "draft")).toBe(false);
    });

    test("returns false for completed → building", () => {
      expect(isValidTransition("completed", "building")).toBe(false);
    });

    test("returns false for archived → draft", () => {
      expect(isValidTransition("archived", "draft")).toBe(false);
    });

    test("returns false for archived → building", () => {
      expect(isValidTransition("archived", "building")).toBe(false);
    });

    test("returns false for same-status transition", () => {
      expect(isValidTransition("draft", "draft")).toBe(false);
      expect(isValidTransition("building", "building")).toBe(false);
    });
  });

  describe("transitionSpecStatus", () => {
    test("succeeds for valid draft → building transition", () => {
      createSpec(db, "spec_001", "Test spec", "specs/spec_001.md");

      const result = transitionSpecStatus(db, "spec_001", "building");
      expect(result.success).toBe(true);
      expect(result.previousStatus).toBe("draft");
      expect(result.newStatus).toBe("building");

      const spec = getSpec(db, "spec_001");
      expect(spec!.status).toBe("building");
    });

    test("succeeds for valid building → completed transition", () => {
      createSpec(db, "spec_001", "Test spec", "specs/spec_001.md");
      updateSpecStatus(db, "spec_001", "building");

      const result = transitionSpecStatus(db, "spec_001", "completed");
      expect(result.success).toBe(true);
      expect(result.previousStatus).toBe("building");
      expect(result.newStatus).toBe("completed");
    });

    test("succeeds for valid building → draft transition (failure)", () => {
      createSpec(db, "spec_001", "Test spec", "specs/spec_001.md");
      updateSpecStatus(db, "spec_001", "building");

      const result = transitionSpecStatus(db, "spec_001", "draft");
      expect(result.success).toBe(true);
      expect(result.previousStatus).toBe("building");
      expect(result.newStatus).toBe("draft");
    });

    test("fails for invalid completed → draft transition", () => {
      createSpec(db, "spec_001", "Test spec", "specs/spec_001.md");
      updateSpecStatus(db, "spec_001", "completed");

      const result = transitionSpecStatus(db, "spec_001", "draft");
      expect(result.success).toBe(false);
      expect(result.error).toContain("completed");
      expect(result.error).toContain("draft");

      // Status should not have changed
      const spec = getSpec(db, "spec_001");
      expect(spec!.status).toBe("completed");
    });

    test("fails for invalid completed → building transition", () => {
      createSpec(db, "spec_001", "Test spec", "specs/spec_001.md");
      updateSpecStatus(db, "spec_001", "completed");

      const result = transitionSpecStatus(db, "spec_001", "building");
      expect(result.success).toBe(false);
      expect(result.error).toContain("completed");
    });

    test("fails for invalid archived → draft transition", () => {
      createSpec(db, "spec_001", "Test spec", "specs/spec_001.md");
      updateSpecStatus(db, "spec_001", "archived");

      const result = transitionSpecStatus(db, "spec_001", "draft");
      expect(result.success).toBe(false);
      expect(result.error).toContain("archived");
    });

    test("fails when spec not found", () => {
      const result = transitionSpecStatus(db, "nonexistent", "building");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    test("succeeds for any status → archived", () => {
      createSpec(db, "spec_001", "Test spec", "specs/spec_001.md");
      const result = transitionSpecStatus(db, "spec_001", "archived");
      expect(result.success).toBe(true);
      expect(result.newStatus).toBe("archived");
    });

    test("returns the full transition result shape", () => {
      createSpec(db, "spec_001", "Test spec", "specs/spec_001.md");
      const result = transitionSpecStatus(db, "spec_001", "building");

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("previousStatus");
      expect(result).toHaveProperty("newStatus");
      // error should be undefined on success
      expect(result.error).toBeUndefined();
    });
  });
});
