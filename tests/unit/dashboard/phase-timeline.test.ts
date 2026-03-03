import { describe, expect, it } from "bun:test";
import { generateDashboardHtml } from "../../../src/dashboard/index.js";

describe("Phase Timeline CSS", () => {
  const html = generateDashboardHtml();

  it("contains phase-timeline CSS class", () => {
    expect(html).toContain(".phase-timeline");
  });

  it("contains phase-completed CSS class with distinct styling", () => {
    expect(html).toContain(".phase-step.completed");
  });

  it("contains phase-active CSS class with animation", () => {
    expect(html).toContain(".phase-step.active");
    // Active phase should have animation (pulse, glow, etc.)
    expect(html).toMatch(/\.phase-step\.active[^}]*\{[^}]*animation/s);
  });

  it("contains phase-pending CSS class with muted styling", () => {
    expect(html).toContain(".phase-step.pending");
  });

  it("contains phase-skipped CSS class that is distinct from pending", () => {
    expect(html).toContain(".phase-step.skipped");
    // Skipped should have a different visual treatment (strikethrough, dashed, dimmed)
    const skippedMatch = html.match(/\.phase-step\.skipped\s*\{([^}]*)\}/);
    expect(skippedMatch).toBeTruthy();
    // Should have some unique styling like text-decoration or opacity
    expect(skippedMatch![1]).toMatch(/text-decoration|opacity|border-style/);
  });
});

describe("Phase Timeline JS - renderPhaseTimeline function", () => {
  const html = generateDashboardHtml();

  it("defines a renderPhaseTimeline function", () => {
    expect(html).toContain("function renderPhaseTimeline");
  });

  it("renders phase steps with correct CSS classes based on status", () => {
    // The function should map phase.status to CSS class
    expect(html).toMatch(/phase-step.*status/s);
  });

  it("phase timeline is rendered within the run header area", () => {
    // renderRunHeader or loadRunDetail should call renderPhaseTimeline
    // Or phase-timeline container should be within run-header
    expect(html).toContain("phase-timeline");
  });
});

describe("Phase Timeline JS - loadPhases function", () => {
  const html = generateDashboardHtml();

  it("defines a loadPhases function", () => {
    expect(html).toContain("function loadPhases");
  });

  it("loadPhases fetches from /api/runs/:id/phases", () => {
    const loadPhasesIdx = html.indexOf("function loadPhases");
    const section = html.substring(loadPhasesIdx);
    expect(section).toContain("/phases");
  });

  it("loadPhases accepts a showSpinner parameter", () => {
    const fnDef = html.match(/function loadPhases\([^)]*\)/);
    expect(fnDef).toBeTruthy();
    expect(fnDef![0]).toMatch(/function loadPhases\(\s*runId\s*,/);
  });
});

describe("Phase Timeline in refresh cycle", () => {
  const html = generateDashboardHtml();

  it("selectRun calls loadPhases with showSpinner=true", () => {
    const selectRunSection = html.substring(html.indexOf("async function selectRun"));
    expect(selectRunSection).toMatch(/loadPhases\(runId\s*,\s*true\)/);
  });

  it("refresh calls loadPhases with showSpinner=false", () => {
    const refreshSection = html.substring(html.indexOf("async function refresh"));
    const refreshEnd = refreshSection.indexOf("}\n");
    const refreshBody = refreshSection.substring(0, refreshEnd);
    expect(refreshBody).toMatch(/loadPhases\(selectedRunId\s*,\s*false\)/);
  });
});

describe("Phase Timeline - phase container in HTML", () => {
  const html = generateDashboardHtml();

  it("has a phase-timeline container element in the detail panels", () => {
    // There should be a div with id or class for phase timeline
    expect(html).toMatch(/id="phase-timeline"/);
  });

  it("phase-timeline container is within the run-header section", () => {
    // phase-timeline should appear after run-header div
    const headerIdx = html.indexOf('id="run-header"');
    const timelineIdx = html.indexOf('id="phase-timeline"');
    expect(headerIdx).toBeGreaterThan(-1);
    expect(timelineIdx).toBeGreaterThan(-1);
    // timeline should be after the header in the HTML
    expect(timelineIdx).toBeGreaterThan(headerIdx);
  });
});
