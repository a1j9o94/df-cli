import { describe, expect, test } from "bun:test";
import { generateDashboardHtml } from "../../../src/dashboard/index.js";

describe("Dashboard UI - Spec Editor", () => {
  const html = generateDashboardHtml({ projectName: "Test Factory" });

  describe("Spec List Sidebar", () => {
    test("sidebar has spec-centric container", () => {
      expect(html).toContain('id="specs-list"');
      expect(html).toContain('id="specs-container"');
    });

    test("sidebar has 'New Spec' button", () => {
      expect(html).toContain('id="new-spec-btn"');
      expect(html).toContain("New Spec");
    });

    test("sidebar title says 'Specs' not just 'Runs'", () => {
      expect(html).toContain("Specs");
    });
  });

  describe("Spec Creation Flow", () => {
    test("has creation modal/panel markup", () => {
      expect(html).toContain('id="create-spec-modal"');
    });

    test("creation form has description textarea", () => {
      expect(html).toContain('id="spec-description-input"');
    });

    test("creation form has submit button", () => {
      expect(html).toContain('id="create-spec-submit"');
    });
  });

  describe("Inline Markdown Editor", () => {
    test("has editor panel markup", () => {
      expect(html).toContain('id="spec-editor-panel"');
    });

    test("has split view: raw editor and preview", () => {
      expect(html).toContain('id="spec-editor-raw"');
      expect(html).toContain('id="spec-editor-preview"');
    });

    test("has save button", () => {
      expect(html).toContain('id="spec-save-btn"');
    });

    test("has saved indicator", () => {
      expect(html).toContain('id="spec-saved-indicator"');
    });
  });

  describe("Build Button", () => {
    test("has build button markup", () => {
      expect(html).toContain('id="spec-build-btn"');
    });
  });

  describe("Immutability Guard", () => {
    test("has locked badge markup", () => {
      expect(html).toContain("locked-badge");
    });

    test("has locked explanation text", () => {
      expect(html).toContain("This spec has a completed build");
    });
  });

  describe("JavaScript Functionality", () => {
    test("has loadSpecs function", () => {
      expect(html).toContain("loadSpecs");
    });

    test("has createSpec function", () => {
      expect(html).toContain("createSpec");
    });

    test("has saveSpec function", () => {
      expect(html).toContain("saveSpec");
    });

    test("has startBuild function", () => {
      expect(html).toContain("startBuild");
    });

    test("has auto-save debounce logic", () => {
      expect(html).toContain("debounce");
    });

    test("fetches /api/specs for spec list", () => {
      expect(html).toContain("/api/specs");
    });

    test("fetches /api/builds for build trigger", () => {
      expect(html).toContain("/api/builds");
    });
  });
});
