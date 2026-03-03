import { describe, test, expect } from "bun:test";
import {
  buildConflictResolutionPrompt,
  type ConflictedFile,
  type ConflictPromptContext,
} from "../../../src/pipeline/instructions.js";

// =============================================================================
// Basic conflict prompt structure
// =============================================================================

const sampleConflictContent = `export function greet() {
  return "Hello from module A";
}`;

const baseContext: ConflictPromptContext = {
  agentId: "agt_test123",
  runId: "run_test456",
  targetBranch: "main",
  headModuleName: "module-a",
  incomingModuleName: "module-b",
  incomingBranch: "df-build/run_01/module-b-abc123",
  conflictedFiles: [
    {
      path: "src/shared/greet.ts",
      content: sampleConflictContent,
    },
  ],
};

describe("buildConflictResolutionPrompt — basic structure", () => {
  test("returns a string", () => {
    const prompt = buildConflictResolutionPrompt(baseContext);
    expect(typeof prompt).toBe("string");
  });

  test("includes a heading identifying it as conflict resolution", () => {
    const prompt = buildConflictResolutionPrompt(baseContext);
    expect(prompt).toMatch(/conflict resolution/i);
  });

  test("includes the agent ID", () => {
    const prompt = buildConflictResolutionPrompt(baseContext);
    expect(prompt).toContain("agt_test123");
  });

  test("includes the run ID", () => {
    const prompt = buildConflictResolutionPrompt(baseContext);
    expect(prompt).toContain("run_test456");
  });

  test("includes the target branch", () => {
    const prompt = buildConflictResolutionPrompt(baseContext);
    expect(prompt).toContain("main");
  });

  test("includes dark agent complete instruction", () => {
    const prompt = buildConflictResolutionPrompt(baseContext);
    expect(prompt).toContain("dark agent complete agt_test123");
  });

  test("includes dark agent fail instruction", () => {
    const prompt = buildConflictResolutionPrompt(baseContext);
    expect(prompt).toContain("dark agent fail agt_test123");
  });
});

// =============================================================================
// Conflicted files listing
// =============================================================================

describe("buildConflictResolutionPrompt — conflicted files", () => {
  test("lists each conflicted file path", () => {
    const prompt = buildConflictResolutionPrompt(baseContext);
    expect(prompt).toContain("src/shared/greet.ts");
  });

  test("includes the conflict content for each file", () => {
    const prompt = buildConflictResolutionPrompt(baseContext);
    expect(prompt).toContain("<<<<<<< HEAD");
    expect(prompt).toContain("=======");
    expect(prompt).toContain(">>>>>>> incoming");
  });

  test("handles multiple conflicted files", () => {
    const multiFileContext: ConflictPromptContext = {
      ...baseContext,
      conflictedFiles: [
        { path: "src/a.ts", content: "<<<<<<< HEAD\nA-head\n=======\nA-incoming\n>>>>>>> incoming" },
        { path: "src/b.ts", content: "<<<<<<< HEAD\nB-head\n=======\nB-incoming\n>>>>>>> incoming" },
        { path: "src/c.ts", content: "<<<<<<< HEAD\nC-head\n=======\nC-incoming\n>>>>>>> incoming" },
      ],
    };
    const prompt = buildConflictResolutionPrompt(multiFileContext);
    expect(prompt).toContain("src/a.ts");
    expect(prompt).toContain("src/b.ts");
    expect(prompt).toContain("src/c.ts");
    expect(prompt).toContain("A-head");
    expect(prompt).toContain("B-incoming");
    expect(prompt).toContain("C-head");
  });

  test("handles single conflicted file", () => {
    const prompt = buildConflictResolutionPrompt(baseContext);
    // Should still work with just one file
    expect(prompt).toContain("src/shared/greet.ts");
  });
});

// =============================================================================
// Module attribution (HEAD side vs incoming side)
// =============================================================================

describe("buildConflictResolutionPrompt — module attribution", () => {
  test("identifies the HEAD side module name", () => {
    const prompt = buildConflictResolutionPrompt(baseContext);
    expect(prompt).toContain("module-a");
  });

  test("identifies the incoming side module name", () => {
    const prompt = buildConflictResolutionPrompt(baseContext);
    expect(prompt).toContain("module-b");
  });

  test("explains HEAD side is already merged", () => {
    const prompt = buildConflictResolutionPrompt(baseContext);
    expect(prompt).toMatch(/HEAD.*already merged|already merged.*HEAD/i);
  });

  test("explains incoming side is being merged", () => {
    const prompt = buildConflictResolutionPrompt(baseContext);
    expect(prompt).toMatch(/incoming.*being merged|being merged.*incoming/i);
  });

  test("states both changes are intentional", () => {
    const prompt = buildConflictResolutionPrompt(baseContext);
    expect(prompt).toMatch(/both.*intentional|intentional.*both/i);
  });

  test("instructs to combine both sides", () => {
    const prompt = buildConflictResolutionPrompt(baseContext);
    expect(prompt).toMatch(/combine/i);
  });

  test("includes the incoming branch name", () => {
    const prompt = buildConflictResolutionPrompt(baseContext);
    expect(prompt).toContain("df-build/run_01/module-b-abc123");
  });
});

// =============================================================================
// Resolution instructions
// =============================================================================

describe("buildConflictResolutionPrompt — resolution instructions", () => {
  test("instructs to resolve conflicts in each file", () => {
    const prompt = buildConflictResolutionPrompt(baseContext);
    expect(prompt).toMatch(/resolve/i);
  });

  test("instructs to git add resolved files", () => {
    const prompt = buildConflictResolutionPrompt(baseContext);
    expect(prompt).toContain("git add");
  });

  test("instructs to git commit after resolution", () => {
    const prompt = buildConflictResolutionPrompt(baseContext);
    expect(prompt).toMatch(/git commit|git merge --continue/i);
  });

  test("instructs to remove conflict markers", () => {
    const prompt = buildConflictResolutionPrompt(baseContext);
    expect(prompt).toMatch(/conflict marker|<<<<<<<|marker/i);
  });

  test("warns not to drop either side's changes", () => {
    const prompt = buildConflictResolutionPrompt(baseContext);
    expect(prompt).toMatch(/do not (drop|discard|remove)|preserve.*both|keep.*both/i);
  });
});

// =============================================================================
// Edge cases
// =============================================================================

describe("buildConflictResolutionPrompt — edge cases", () => {
  test("handles empty conflicted files array gracefully", () => {
    const emptyContext: ConflictPromptContext = {
      ...baseContext,
      conflictedFiles: [],
    };
    const prompt = buildConflictResolutionPrompt(emptyContext);
    expect(typeof prompt).toBe("string");
    // Should still produce a valid prompt
    expect(prompt).toMatch(/conflict resolution/i);
  });

  test("handles very long file content", () => {
    const longContent = "<<<<<<< HEAD\n" + "x".repeat(10000) + "\n=======\n" + "y".repeat(10000) + "\n>>>>>>> incoming";
    const longContext: ConflictPromptContext = {
      ...baseContext,
      conflictedFiles: [{ path: "src/big.ts", content: longContent }],
    };
    const prompt = buildConflictResolutionPrompt(longContext);
    expect(prompt).toContain("src/big.ts");
  });

  test("handles file paths with special characters", () => {
    const specialContext: ConflictPromptContext = {
      ...baseContext,
      conflictedFiles: [
        { path: "src/utils/my-file (copy).ts", content: sampleConflictContent },
      ],
    };
    const prompt = buildConflictResolutionPrompt(specialContext);
    expect(prompt).toContain("src/utils/my-file (copy).ts");
  });
});
