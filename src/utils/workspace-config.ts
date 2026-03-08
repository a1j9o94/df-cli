import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import type { WorkspaceConfig, ProjectRef } from "../types/workspace.js";

/**
 * Search upward from startDir for a .df-workspace directory.
 * Returns the absolute path to .df-workspace/ or null.
 */
export function findWorkspaceDir(startDir?: string): string | null {
  let dir = resolve(startDir ?? process.cwd());

  while (true) {
    const candidate = join(dir, ".df-workspace");
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
}

/**
 * Load workspace configuration from .df-workspace/config.yaml.
 */
export function getWorkspaceConfig(workspaceDir: string): WorkspaceConfig {
  const configPath = join(workspaceDir, "config.yaml");
  if (!existsSync(configPath)) {
    return { projects: [], sharedContracts: [] };
  }

  const raw = readFileSync(configPath, "utf-8");
  const parsed = parseYaml(raw) as Partial<WorkspaceConfig> | null;

  return {
    projects: parsed?.projects ?? [],
    sharedContracts: parsed?.sharedContracts ?? [],
  };
}

/**
 * Resolve relative project paths to absolute paths based on workspace root.
 * Also resolves dfDir to the .df/ directory within each project.
 */
export function resolveProjectPaths(workspaceDir: string, config: WorkspaceConfig): ProjectRef[] {
  // workspaceDir is the .df-workspace/ dir, workspace root is parent
  const workspaceRoot = dirname(workspaceDir);

  return config.projects.map((project) => {
    const absolutePath = resolve(workspaceRoot, project.path);
    const dfDir = join(absolutePath, ".df");
    return {
      ...project,
      path: absolutePath,
      dfDir,
    };
  });
}

/**
 * Detect whether the current directory is inside a project, workspace, or neither.
 * Project (.df/) takes priority over workspace (.df-workspace/).
 */
export function detectContext(startDir?: string): { type: "global" | "workspace" | "project"; path: string | null } {
  const dir = resolve(startDir ?? process.cwd());

  // Check for .df (project) first - search upward
  let current = dir;
  while (true) {
    const dfCandidate = join(current, ".df");
    if (existsSync(dfCandidate)) {
      return { type: "project", path: dfCandidate };
    }

    const dfWsCandidate = join(current, ".df-workspace");
    if (existsSync(dfWsCandidate)) {
      return { type: "workspace", path: dfWsCandidate };
    }

    const parent = dirname(current);
    if (parent === current) {
      return { type: "global", path: null };
    }
    current = parent;
  }
}
