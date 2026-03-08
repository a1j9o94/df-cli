import { test, expect, describe } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");

describe("Site directory structure", () => {
  test("site/ directory exists", () => {
    expect(existsSync(join(ROOT, "site"))).toBe(true);
  });

  test("site/index.html exists", () => {
    expect(existsSync(join(ROOT, "site", "index.html"))).toBe(true);
  });

  test("index.html contains Dark Factory reference", () => {
    const html = readFileSync(join(ROOT, "site", "index.html"), "utf-8");
    expect(html.toLowerCase()).toContain("dark factory");
  });

  test("site/assets/ directory exists for screenshots", () => {
    expect(existsSync(join(ROOT, "site", "assets"))).toBe(true);
  });

  test("vercel.json outputDirectory matches site/", () => {
    const vercelConfig = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf-8"));
    expect(vercelConfig.outputDirectory).toBe("site");
  });
});
