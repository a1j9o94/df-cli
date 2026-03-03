import { describe, test, expect } from "bun:test";
import { mapLabels, type LabelMapping } from "../../../src/importers/label-mapper.js";

describe("mapLabels", () => {
  // Type mappings
  test("maps 'bug' label to type: bug", () => {
    const result = mapLabels(["bug"]);
    expect(result.type).toBe("bug");
  });

  test("maps 'bugfix' label to type: bug", () => {
    const result = mapLabels(["bugfix"]);
    expect(result.type).toBe("bug");
  });

  test("maps 'defect' label to type: bug", () => {
    const result = mapLabels(["defect"]);
    expect(result.type).toBe("bug");
  });

  test("maps 'enhancement' label to type: feature", () => {
    const result = mapLabels(["enhancement"]);
    expect(result.type).toBe("feature");
  });

  test("maps 'feature' label to type: feature", () => {
    const result = mapLabels(["feature"]);
    expect(result.type).toBe("feature");
  });

  test("maps 'feature-request' label to type: feature", () => {
    const result = mapLabels(["feature-request"]);
    expect(result.type).toBe("feature");
  });

  // Priority mappings
  test("maps 'p0' label to priority: critical", () => {
    const result = mapLabels(["p0"]);
    expect(result.priority).toBe("critical");
  });

  test("maps 'critical' label to priority: critical", () => {
    const result = mapLabels(["critical"]);
    expect(result.priority).toBe("critical");
  });

  test("maps 'urgent' label to priority: critical", () => {
    const result = mapLabels(["urgent"]);
    expect(result.priority).toBe("critical");
  });

  test("maps 'p1' label to priority: high", () => {
    const result = mapLabels(["p1"]);
    expect(result.priority).toBe("high");
  });

  test("maps 'high' label to priority: high", () => {
    const result = mapLabels(["high"]);
    expect(result.priority).toBe("high");
  });

  test("maps 'p2' label to priority: medium", () => {
    const result = mapLabels(["p2"]);
    expect(result.priority).toBe("medium");
  });

  test("maps 'medium' label to priority: medium", () => {
    const result = mapLabels(["medium"]);
    expect(result.priority).toBe("medium");
  });

  test("maps 'p3' label to priority: low", () => {
    const result = mapLabels(["p3"]);
    expect(result.priority).toBe("low");
  });

  test("maps 'low' label to priority: low", () => {
    const result = mapLabels(["low"]);
    expect(result.priority).toBe("low");
  });

  // Combined
  test("maps both type and priority from label list", () => {
    const result = mapLabels(["bug", "p0"]);
    expect(result.type).toBe("bug");
    expect(result.priority).toBe("critical");
  });

  test("maps type and priority with unrecognized labels", () => {
    const result = mapLabels(["bug", "p1", "needs-review", "component:auth"]);
    expect(result.type).toBe("bug");
    expect(result.priority).toBe("high");
  });

  // Defaults
  test("returns default type 'feature' when no type label found", () => {
    const result = mapLabels(["p1"]);
    expect(result.type).toBe("feature");
  });

  test("returns default priority 'medium' when no priority label found", () => {
    const result = mapLabels(["bug"]);
    expect(result.priority).toBe("medium");
  });

  test("returns defaults for empty label list", () => {
    const result = mapLabels([]);
    expect(result.type).toBe("feature");
    expect(result.priority).toBe("medium");
  });

  test("returns defaults when all labels unrecognized", () => {
    const result = mapLabels(["wontfix", "duplicate", "good-first-issue"]);
    expect(result.type).toBe("feature");
    expect(result.priority).toBe("medium");
  });

  // Case insensitivity
  test("matching is case-insensitive", () => {
    const result = mapLabels(["Bug", "P0"]);
    expect(result.type).toBe("bug");
    expect(result.priority).toBe("critical");
  });

  // Source tracking
  test("includes source label in result when matched", () => {
    const result = mapLabels(["bug", "p1"]);
    expect(result.typeSource).toBe("bug");
    expect(result.prioritySource).toBe("p1");
  });

  test("source is undefined when using defaults", () => {
    const result = mapLabels([]);
    expect(result.typeSource).toBeUndefined();
    expect(result.prioritySource).toBeUndefined();
  });
});
