import type { ModuleDefinition } from "./buildplan.js";

export interface WorkspaceConfig {
  projects: ProjectRef[];
  sharedContracts: ContractRef[];
}

export interface ProjectRef {
  name: string;
  path: string;
  role: string;
  dfDir: string; // resolved absolute path to project .df/
}

export interface ContractRef {
  name: string;
  file: string; // path relative to workspace root
  type: "openapi" | "graphql" | "typescript" | "json-schema";
  boundProjects: string[]; // project names
}

// Extension to ModuleDefinition
export interface CrossRepoModule extends ModuleDefinition {
  targetProject: string; // name from WorkspaceConfig.projects
}

// Extension to scenario frontmatter
export interface CrossRepoScenario {
  projects: string[]; // project names this scenario spans
}

// Registry entry
export interface RegistryEntry {
  name: string;
  path: string;
  type: "project" | "workspace";
  lastRunStatus?: string;
  lastRunDate?: string;
}
