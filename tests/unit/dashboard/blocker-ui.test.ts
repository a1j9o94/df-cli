import { describe, expect, test } from "bun:test";
import { generateDashboardHtml } from "../../../src/dashboard/index.js";

describe("Dashboard blocker UI elements", () => {
  const html = generateDashboardHtml({ projectName: "Test Project" });

  test("includes blocker banner container element", () => {
    expect(html).toContain('id="blocker-banner"');
  });

  test("includes blocker-related CSS styles", () => {
    expect(html).toContain(".blocker-banner");
    expect(html).toContain(".blocker-card");
  });

  test("blocker banner uses yellow/warning styling", () => {
    // The banner should have a yellow/warning color scheme
    expect(html).toMatch(/blocker-banner.*background.*#\w+|blocker-banner[^}]*amber|blocker-banner[^}]*yellow|accent-yellow/s);
  });

  test("includes JavaScript function to load blockers", () => {
    expect(html).toContain("loadBlockers");
  });

  test("includes JavaScript function to render blockers", () => {
    expect(html).toContain("renderBlockers");
  });

  test("includes JavaScript function to resolve a blocker", () => {
    expect(html).toContain("resolveBlocker");
  });

  test("blocker cards show type badges", () => {
    expect(html).toContain("blocker-type");
  });

  test("secret type blockers use password input", () => {
    expect(html).toContain("type=\"password\"");
  });

  test("includes blocker polling in the refresh cycle", () => {
    // The dashboard should poll for blockers as part of its refresh
    expect(html).toContain("blockers");
  });
});
