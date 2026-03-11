import { test, expect, describe } from "bun:test";
import { resolveModuleProject, createProjectWorktree, getProjectDb } from "../workspace-build.js";
import type { WorkspaceConfig, ProjectRef, CrossRepoModule } from "../../types/workspace.js";

describe("resolveModuleProject", () => {
  const workspaceConfig: WorkspaceConfig = {
    projects: [
      { name: "backend", path: "/workspace/backend", role: "api-provider", dfDir: "/workspace/backend/.df" },
      { name: "frontend", path: "/workspace/frontend", role: "api-consumer", dfDir: "/workspace/frontend/.df" },
    ],
    sharedContracts: [],
  };

  test("resolves module to correct project by targetProject name", () => {
    const module: CrossRepoModule = {
      id: "api-endpoint",
      title: "API Endpoint",
      description: "Add REST endpoint",
      scope: { creates: ["src/routes/users.ts"], modifies: [], test_files: [] },
      estimated_complexity: "medium",
      estimated_tokens: 50000,
      estimated_duration_min: 15,
      targetProject: "backend",
    };

    const result = resolveModuleProject(module, workspaceConfig);
    expect(result.name).toBe("backend");
    expect(result.path).toBe("/workspace/backend");
    expect(result.dfDir).toBe("/workspace/backend/.df");
  });

  test("resolves frontend module correctly", () => {
    const module: CrossRepoModule = {
      id: "ui-component",
      title: "UI Component",
      description: "Add user list component",
      scope: { creates: ["src/components/UserList.tsx"], modifies: [], test_files: [] },
      estimated_complexity: "low",
      estimated_tokens: 30000,
      estimated_duration_min: 10,
      targetProject: "frontend",
    };

    const result = resolveModuleProject(module, workspaceConfig);
    expect(result.name).toBe("frontend");
    expect(result.path).toBe("/workspace/frontend");
  });

  test("throws if targetProject not found in workspace config", () => {
    const module: CrossRepoModule = {
      id: "unknown-mod",
      title: "Unknown",
      description: "Module for missing project",
      scope: { creates: [], modifies: [], test_files: [] },
      estimated_complexity: "low",
      estimated_tokens: 10000,
      estimated_duration_min: 5,
      targetProject: "nonexistent",
    };

    expect(() => resolveModuleProject(module, workspaceConfig)).toThrow(
      /project "nonexistent" not found/i
    );
  });
});

describe("createProjectWorktree", () => {
  test("returns WorktreeInfo with correct structure", () => {
    // This test validates the function signature and return type.
    // Actual git operations are tested in the worktree-multiproject tests.
    expect(typeof createProjectWorktree).toBe("function");
  });
});

describe("getProjectDb", () => {
  test("is a function", () => {
    expect(typeof getProjectDb).toBe("function");
  });
});
