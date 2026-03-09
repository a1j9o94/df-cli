import { Command } from "commander";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";
import { stringify as yamlStringify } from "yaml";
import { registerProject } from "../../utils/registry.js";
import type { ProjectRef } from "../../types/workspace.js";

export interface InitWorkspaceOptions {
  name?: string;
}

/**
 * Core logic for initializing a workspace. Exported for testing.
 */
export async function initWorkspace(options: InitWorkspaceOptions): Promise<void> {
  const cwd = process.cwd();
  const wsDir = join(cwd, ".df-workspace");

  if (existsSync(wsDir)) {
    throw new Error(".df-workspace/ already exists in this directory");
  }

  const workspaceName = options.name ?? basename(cwd);

  // Create .df-workspace directory
  mkdirSync(wsDir, { recursive: true });

  // Auto-detect subdirectories that have .df/ (i.e., are dark factory projects)
  const projects: Array<{ name: string; path: string; role: string }> = [];
  const entries = readdirSync(cwd, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith(".")) {
      const subDir = join(cwd, entry.name);
      if (existsSync(join(subDir, ".df"))) {
        projects.push({
          name: entry.name,
          path: `./${entry.name}`,
          role: "member",
        });
      }
    }
  }

  // Write config.yaml
  const config = {
    name: workspaceName,
    projects,
    sharedContracts: [],
  };
  writeFileSync(join(wsDir, "config.yaml"), yamlStringify(config));

  // Register the workspace in the global registry
  registerProject({
    name: workspaceName,
    path: cwd,
    type: "workspace",
  });
}

export const workspaceInitCommand = new Command("init")
  .description("Initialize a workspace in the current directory")
  .option("--name <name>", "Workspace name")
  .action(async (options: { name?: string }) => {
    try {
      await initWorkspace(options);
      console.log(`Workspace initialized successfully.`);
    } catch (err: any) {
      console.error(err.message);
      process.exit(1);
    }
  });
