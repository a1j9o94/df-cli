import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import type { DfConfig } from "../types/config.js";
import { DEFAULT_CONFIG } from "../types/config.js";

export function findDfDir(startDir?: string): string | null {
  let dir = resolve(startDir ?? process.cwd());
  const root = dirname(dir);

  while (true) {
    const candidate = join(dir, ".df");
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir || dir === root) {
      return null;
    }
    dir = parent;
  }
}

export function getConfig(dfDir?: string): DfConfig {
  const dir = dfDir ?? findDfDir();
  if (!dir) {
    return { ...DEFAULT_CONFIG };
  }

  const configPath = join(dir, "config.yaml");
  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  const raw = readFileSync(configPath, "utf-8");
  const parsed = parseYaml(raw) as Partial<DfConfig>;

  return deepMerge(DEFAULT_CONFIG as unknown as Record<string, unknown>, parsed as unknown as Record<string, unknown>) as unknown as DfConfig;
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = target[key];
    if (sv && typeof sv === "object" && !Array.isArray(sv) && tv && typeof tv === "object" && !Array.isArray(tv)) {
      result[key] = deepMerge(tv as Record<string, unknown>, sv as Record<string, unknown>);
    } else if (sv !== undefined) {
      result[key] = sv;
    }
  }
  return result;
}
