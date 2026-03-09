import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { parse as parseYaml, stringify as yamlStringify } from "yaml";
import type { RegistryEntry } from "../types/workspace.js";

export function getRegistryPath(): string {
  const home = process.env.HOME ?? homedir();
  return join(home, ".dark", "registry.yaml");
}

export function loadRegistry(): RegistryEntry[] {
  const registryPath = getRegistryPath();
  if (!existsSync(registryPath)) {
    return [];
  }

  const raw = readFileSync(registryPath, "utf-8");
  const parsed = parseYaml(raw) as { entries?: RegistryEntry[] } | null;
  return parsed?.entries ?? [];
}

export function registerProject(entry: RegistryEntry): void {
  const entries = loadRegistry();

  // Update existing entry by path, or add new
  const existingIndex = entries.findIndex((e) => e.path === entry.path);
  if (existingIndex >= 0) {
    entries[existingIndex] = entry;
  } else {
    entries.push(entry);
  }

  saveRegistry(entries);
}

export function unregisterProject(path: string): void {
  const entries = loadRegistry();
  const filtered = entries.filter((e) => e.path !== path);

  if (filtered.length !== entries.length) {
    saveRegistry(filtered);
  }
}

export function pruneRegistry(): { removed: string[]; remaining: string[] } {
  const entries = loadRegistry();
  const removed: string[] = [];
  const remaining: string[] = [];

  const kept: RegistryEntry[] = [];
  for (const entry of entries) {
    if (existsSync(entry.path)) {
      kept.push(entry);
      remaining.push(entry.path);
    } else {
      removed.push(entry.path);
    }
  }

  saveRegistry(kept);
  return { removed, remaining };
}

function saveRegistry(entries: RegistryEntry[]): void {
  const registryPath = getRegistryPath();
  const dir = dirname(registryPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(registryPath, yamlStringify({ entries }));
}
