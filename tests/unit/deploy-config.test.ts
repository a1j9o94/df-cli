import { test, expect, describe } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");

describe("Vercel deployment config", () => {
  test("vercel.json exists and contains valid JSON", () => {
    const vercelPath = join(ROOT, "vercel.json");
    expect(existsSync(vercelPath)).toBe(true);

    const raw = readFileSync(vercelPath, "utf-8");
    const config = JSON.parse(raw);
    expect(config).toBeDefined();
  });

  test("vercel.json has buildCommand or outputDirectory", () => {
    const vercelPath = join(ROOT, "vercel.json");
    const config = JSON.parse(readFileSync(vercelPath, "utf-8"));

    const hasBuildConfig =
      config.buildCommand || config.outputDirectory || config.framework;
    expect(hasBuildConfig).toBeTruthy();
  });

  test("vercel.json has site output directory configured", () => {
    const vercelPath = join(ROOT, "vercel.json");
    const config = JSON.parse(readFileSync(vercelPath, "utf-8"));
    expect(config.outputDirectory).toBeDefined();
  });
});

describe("DNS setup documentation", () => {
  test("DNS-SETUP.md exists", () => {
    const dnsPath = join(ROOT, "DNS-SETUP.md");
    expect(existsSync(dnsPath)).toBe(true);
  });

  test("DNS docs specify A record to Vercel IP 76.76.21.21", () => {
    const content = readFileSync(join(ROOT, "DNS-SETUP.md"), "utf-8");
    expect(content).toContain("76.76.21.21");
  });

  test("DNS docs specify CNAME for www to cname.vercel-dns.com", () => {
    const content = readFileSync(join(ROOT, "DNS-SETUP.md"), "utf-8");
    expect(content).toContain("cname.vercel-dns.com");
  });

  test("DNS docs include verification steps", () => {
    const content = readFileSync(join(ROOT, "DNS-SETUP.md"), "utf-8");
    // Should mention how to verify DNS propagation and HTTPS
    expect(content.toLowerCase()).toContain("verif");
    expect(content.toLowerCase()).toContain("https");
  });
});
