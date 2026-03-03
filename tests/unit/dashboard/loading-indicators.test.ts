import { describe, expect, it } from "bun:test";
import { generateDashboardHtml } from "../../../src/dashboard/index.js";

describe("Loading Spinner CSS", () => {
  const html = generateDashboardHtml();

  it("contains loading-spinner CSS class with animation", () => {
    expect(html).toContain(".loading-spinner");
  });

  it("contains @keyframes spin animation", () => {
    expect(html).toContain("@keyframes spin");
  });

  it("loading-spinner has CSS animation (not just static text)", () => {
    // The spinner should use a CSS animation, not just static text
    expect(html).toMatch(/\.loading-spinner[^}]*animation[^}]*spin/s);
  });
});

describe("Loading Spinner JS - Agents Panel", () => {
  const html = generateDashboardHtml();

  it("shows loading spinner before fetching agents", () => {
    // The loadAgents function should set a loading-spinner before fetch
    expect(html).toContain("loading-spinner");
    expect(html).toMatch(/Loading agents/);
  });

  it("sets loading state before fetchJson call for agents", () => {
    // The JS should set innerHTML to a spinner before the fetch call
    expect(html).toMatch(/loading-spinner.*Loading agents/s);
  });
});

describe("Loading Spinner JS - Modules Panel", () => {
  const html = generateDashboardHtml();

  it("shows loading spinner before fetching modules", () => {
    expect(html).toContain("loading-spinner");
    expect(html).toMatch(/Loading modules/);
  });

  it("sets loading state before fetchJson call for modules", () => {
    expect(html).toMatch(/loading-spinner.*Loading modules/s);
  });
});
