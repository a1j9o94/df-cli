import { test, expect, describe } from "bun:test";

const SITE_DIR = `${import.meta.dir}/../../../site`;

describe("Landing page HTML structure", () => {
  test("index.html exists", async () => {
    const file = Bun.file(`${SITE_DIR}/index.html`);
    expect(await file.exists()).toBe(true);
  });

  test("contains hero section", async () => {
    const html = await Bun.file(`${SITE_DIR}/index.html`).text();
    expect(html).toContain('id="hero"');
    expect(html).toContain("Dark Factory");
    expect(html).toContain("AI agents that build software");
  });

  test("contains how-it-works section", async () => {
    const html = await Bun.file(`${SITE_DIR}/index.html`).text();
    expect(html).toContain('id="how-it-works"');
    expect(html).toContain("scout");
    expect(html).toContain("architect");
    expect(html).toContain("build");
    expect(html).toContain("evaluate");
    expect(html).toContain("merge");
  });

  test("contains screenshots section", async () => {
    const html = await Bun.file(`${SITE_DIR}/index.html`).text();
    expect(html).toContain('id="screenshots"');
  });

  test("contains key features section", async () => {
    const html = await Bun.file(`${SITE_DIR}/index.html`).text();
    expect(html).toContain('id="features"');
    expect(html).toContain("Parallel");
    expect(html).toContain("Holdout");
    expect(html).toContain("Contract");
    expect(html).toContain("Budget");
  });

  test("contains CLI examples section", async () => {
    const html = await Bun.file(`${SITE_DIR}/index.html`).text();
    expect(html).toContain('id="cli"');
    expect(html).toContain("dark build");
    expect(html).toContain("dark status");
  });

  test("contains get-started section", async () => {
    const html = await Bun.file(`${SITE_DIR}/index.html`).text();
    expect(html).toContain('id="get-started"');
    expect(html).toContain("git clone");
    expect(html).toContain("bun install");
    expect(html).toContain("dark init");
  });

  test("contains footer with GitHub link", async () => {
    const html = await Bun.file(`${SITE_DIR}/index.html`).text();
    expect(html).toContain("<footer");
    expect(html).toContain("github.com");
    expect(html).toContain("MIT");
  });

  test("has GitHub CTA link in hero", async () => {
    const html = await Bun.file(`${SITE_DIR}/index.html`).text();
    expect(html).toContain('href="https://github.com/a1j9o94/df-cli"');
  });

  test("has viewport meta tag for responsive design", async () => {
    const html = await Bun.file(`${SITE_DIR}/index.html`).text();
    expect(html).toContain("viewport");
    expect(html).toContain("width=device-width");
  });

  test("has dark theme styling", async () => {
    const html = await Bun.file(`${SITE_DIR}/index.html`).text();
    // Should have dark background color references
    expect(html).toContain("background");
  });
});

describe("Landing page styles", () => {
  test("styles.css exists", async () => {
    const file = Bun.file(`${SITE_DIR}/styles.css`);
    expect(await file.exists()).toBe(true);
  });

  test("has dark theme colors", async () => {
    const css = await Bun.file(`${SITE_DIR}/styles.css`).text();
    // Dark backgrounds
    expect(css).toContain("#0a0a0a");
    // Responsive media queries
    expect(css).toContain("@media");
  });

  test("has responsive breakpoints", async () => {
    const css = await Bun.file(`${SITE_DIR}/styles.css`).text();
    expect(css).toContain("max-width");
  });
});

describe("Landing page server", () => {
  test("server.ts exists", async () => {
    const file = Bun.file(`${SITE_DIR}/server.ts`);
    expect(await file.exists()).toBe(true);
  });
});

describe("Screenshots directory", () => {
  test("screenshots directory exists", async () => {
    const { existsSync } = await import("node:fs");
    expect(existsSync(`${SITE_DIR}/screenshots`)).toBe(true);
  });

  test("contains placeholder file", async () => {
    const { existsSync } = await import("node:fs");
    expect(existsSync(`${SITE_DIR}/screenshots/.gitkeep`)).toBe(true);
  });
});
