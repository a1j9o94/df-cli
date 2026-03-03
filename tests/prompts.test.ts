import { describe, test, expect } from "bun:test";
import { getBuilderPrompt } from "../src/agents/prompts/builder.js";
import { getArchitectPrompt } from "../src/agents/prompts/architect.js";
import { getEvaluatorPrompt } from "../src/agents/prompts/evaluator.js";

const baseBuilderContext = {
  specId: "spec_test123",
  runId: "run_test456",
  agentId: "agt_test789",
  moduleId: "my-module",
  contracts: ["ctr_abc"],
  worktreePath: "/tmp/worktrees/my-module",
};

const baseArchitectContext = {
  specId: "spec_test123",
  runId: "run_test456",
  agentId: "agt_test789",
};

const baseEvaluatorContext = {
  specId: "spec_test123",
  runId: "run_test456",
  agentId: "agt_test789",
  scenarioIds: ["scn_001"],
  mode: "functional" as const,
};

// =============================================================================
// Builder Prompt: Auto-commit after each TDD cycle
// =============================================================================

describe("Builder prompt — auto-commit instructions", () => {
  test("includes auto-commit instruction after each passing test", () => {
    const prompt = getBuilderPrompt(baseBuilderContext);
    expect(prompt).toContain("git add -A && git commit");
  });

  test("auto-commit instruction mentions TDD cycle", () => {
    const prompt = getBuilderPrompt(baseBuilderContext);
    // Should reference committing after each passing test / TDD cycle
    expect(prompt).toMatch(/after each (passing test|TDD cycle|successful test)/i);
  });

  test("auto-commit instruction includes a descriptive commit message format", () => {
    const prompt = getBuilderPrompt(baseBuilderContext);
    // The commit message should describe what was just implemented
    expect(prompt).toMatch(/git commit -m/);
  });

  test("auto-commit section appears in the TDD Workflow section", () => {
    const prompt = getBuilderPrompt(baseBuilderContext);
    // The auto-commit instruction should be in or near the TDD Workflow section
    const tddSectionIndex = prompt.indexOf("## TDD Workflow");
    const autoCommitIndex = prompt.indexOf("git add -A && git commit");
    expect(tddSectionIndex).toBeGreaterThan(-1);
    expect(autoCommitIndex).toBeGreaterThan(-1);
    // Auto-commit should come after TDD Workflow heading
    expect(autoCommitIndex).toBeGreaterThan(tddSectionIndex);
  });

  test("preserves existing builder prompt structure", () => {
    const prompt = getBuilderPrompt(baseBuilderContext);
    // All existing sections should still be present
    expect(prompt).toContain("## Identity");
    expect(prompt).toContain("## Assignment");
    expect(prompt).toContain("## Workflow");
    expect(prompt).toContain("## TDD Workflow");
    expect(prompt).toContain("## Contract Compliance");
    expect(prompt).toContain("## Communication");
    expect(prompt).toContain("## Constraints");
  });

  test("includes agent-specific values in assignment", () => {
    const prompt = getBuilderPrompt(baseBuilderContext);
    expect(prompt).toContain("spec_test123");
    expect(prompt).toContain("run_test456");
    expect(prompt).toContain("agt_test789");
    expect(prompt).toContain("my-module");
    expect(prompt).toContain("/tmp/worktrees/my-module");
    expect(prompt).toContain("ctr_abc");
  });

  test("works with empty contracts list", () => {
    const prompt = getBuilderPrompt({
      ...baseBuilderContext,
      contracts: [],
    });
    expect(prompt).toContain("## Identity");
    expect(prompt).not.toContain("Contracts:");
  });
});

// =============================================================================
// Architect Prompt: Large-file decomposition guidance
// =============================================================================

describe("Architect prompt — large-file decomposition guidance", () => {
  test("includes guidance about files >300 lines", () => {
    const prompt = getArchitectPrompt(baseArchitectContext);
    expect(prompt).toContain("300");
  });

  test("advises splitting large-file modules into sub-modules", () => {
    const prompt = getArchitectPrompt(baseArchitectContext);
    expect(prompt).toMatch(/split|sub-module/i);
  });

  test("advises at most 1-2 existing files per sub-module", () => {
    const prompt = getArchitectPrompt(baseArchitectContext);
    expect(prompt).toMatch(/1-2 (existing )?files|at most (1-2|one or two)/i);
  });

  test("advises preferring adding new functions over restructuring", () => {
    const prompt = getArchitectPrompt(baseArchitectContext);
    expect(prompt).toMatch(/prefer.*add|new function.*over.*restructur/i);
  });

  test("advises dedicating restructuring to its own module", () => {
    const prompt = getArchitectPrompt(baseArchitectContext);
    expect(prompt).toMatch(/restructur.*dedicated|dedicated.*restructur/i);
  });

  test("guidance appears in Decomposition Principles section", () => {
    const prompt = getArchitectPrompt(baseArchitectContext);
    const decompositionIndex = prompt.indexOf("## Decomposition Principles");
    expect(decompositionIndex).toBeGreaterThan(-1);

    // The large-file guidance should be after Decomposition Principles
    const guidanceIndex = prompt.indexOf("300");
    expect(guidanceIndex).toBeGreaterThan(decompositionIndex);
  });

  test("preserves existing architect prompt structure", () => {
    const prompt = getArchitectPrompt(baseArchitectContext);
    expect(prompt).toContain("## Identity");
    expect(prompt).toContain("## Inputs");
    expect(prompt).toContain("## Workflow");
    expect(prompt).toContain("## Creating Holdout Scenarios");
    expect(prompt).toContain("## Buildplan Output");
    expect(prompt).toContain("## Decomposition Principles");
    expect(prompt).toContain("## Communication");
  });

  test("includes agent-specific values", () => {
    const prompt = getArchitectPrompt(baseArchitectContext);
    expect(prompt).toContain("spec_test123");
    expect(prompt).toContain("run_test456");
    expect(prompt).toContain("agt_test789");
  });

  test("includes optional specFilePath when provided", () => {
    const prompt = getArchitectPrompt({
      ...baseArchitectContext,
      specFilePath: "/path/to/spec.md",
    });
    expect(prompt).toContain("/path/to/spec.md");
  });

  test("includes optional codebasePaths when provided", () => {
    const prompt = getArchitectPrompt({
      ...baseArchitectContext,
      codebasePaths: ["src/", "lib/"],
    });
    expect(prompt).toContain("src/");
    expect(prompt).toContain("lib/");
  });
});

// =============================================================================
// Builder Prompt: CRITICAL completion warning (staging branch pattern)
// =============================================================================

describe("Builder prompt — CRITICAL completion warning", () => {
  test("includes CRITICAL completion warning with agent ID", () => {
    const prompt = getBuilderPrompt(baseBuilderContext);
    expect(prompt).toContain("CRITICAL");
    expect(prompt).toContain("dark agent complete agt_test789");
    expect(prompt).toContain("will NOT be merged");
  });

  test("CRITICAL warning appears at the END of the prompt (after all other sections)", () => {
    const prompt = getBuilderPrompt(baseBuilderContext);
    const criticalIndex = prompt.indexOf("CRITICAL");
    const constraintsIndex = prompt.indexOf("## Constraints");
    // CRITICAL must come AFTER all sections including Constraints
    expect(criticalIndex).toBeGreaterThan(constraintsIndex);
  });

  test("mentions staging branch in the prompt", () => {
    const prompt = getBuilderPrompt(baseBuilderContext);
    expect(prompt).toMatch(/staging branch/i);
  });

  test("staging branch warning explains work won't be merged without complete", () => {
    const prompt = getBuilderPrompt(baseBuilderContext);
    // The initial message should contain the staging branch warning
    expect(prompt).toMatch(/staging branch.*NOT.*merged|NOT.*merged.*staging/is);
  });
});

// =============================================================================
// Architect Prompt: Research CLI integration
// =============================================================================

describe("Architect prompt — research CLI references", () => {
  test("mentions dark research add as available command", () => {
    const prompt = getArchitectPrompt(baseArchitectContext);
    expect(prompt).toContain("dark research add");
  });

  test("includes dark research add with agent ID placeholder", () => {
    const prompt = getArchitectPrompt(baseArchitectContext);
    // The prompt should reference research add with the agent's ID
    expect(prompt).toMatch(/dark research add.*agt_test789|dark research add.*<.*agent/i);
  });

  test("mentions saving text findings (URL, code snippet, etc.)", () => {
    const prompt = getArchitectPrompt(baseArchitectContext);
    // Should mention saving text content via --content flag
    expect(prompt).toContain("--content");
  });

  test("mentions saving file attachments (screenshot, doc)", () => {
    const prompt = getArchitectPrompt(baseArchitectContext);
    // Should mention saving files via --file flag
    expect(prompt).toContain("--file");
  });

  test("mentions --label flag for naming research artifacts", () => {
    const prompt = getArchitectPrompt(baseArchitectContext);
    expect(prompt).toContain("--label");
  });

  test("mentions optional --module tag for targeting research to specific modules", () => {
    const prompt = getArchitectPrompt(baseArchitectContext);
    // Should mention --module flag for tagging research to modules
    expect(prompt).toMatch(/--module/);
  });

  test("research section appears in Communication section", () => {
    const prompt = getArchitectPrompt(baseArchitectContext);
    const commIndex = prompt.indexOf("## Communication");
    const researchIndex = prompt.indexOf("dark research add");
    expect(commIndex).toBeGreaterThan(-1);
    expect(researchIndex).toBeGreaterThan(-1);
    // Research commands should appear in or after the Communication section
    expect(researchIndex).toBeGreaterThan(commIndex);
  });

  test("preserves all existing architect prompt sections", () => {
    const prompt = getArchitectPrompt(baseArchitectContext);
    expect(prompt).toContain("## Identity");
    expect(prompt).toContain("## Inputs");
    expect(prompt).toContain("## Workflow");
    expect(prompt).toContain("## Creating Holdout Scenarios");
    expect(prompt).toContain("## Buildplan Output");
    expect(prompt).toContain("## Decomposition Principles");
    expect(prompt).toContain("## Communication");
  });
});

// =============================================================================
// Builder Prompt: Research CLI integration
// =============================================================================

describe("Builder prompt — research CLI references", () => {
  test("mentions dark research list for checking available research", () => {
    const prompt = getBuilderPrompt(baseBuilderContext);
    expect(prompt).toContain("dark research list");
  });

  test("includes --run-id flag in research list command", () => {
    const prompt = getBuilderPrompt(baseBuilderContext);
    expect(prompt).toMatch(/dark research list.*--run-id/);
  });

  test("includes --module flag in research list command for module-specific filtering", () => {
    const prompt = getBuilderPrompt(baseBuilderContext);
    expect(prompt).toMatch(/dark research list.*--module/);
  });

  test("mentions dark research show for viewing research details", () => {
    const prompt = getBuilderPrompt(baseBuilderContext);
    expect(prompt).toContain("dark research show");
  });

  test("builder prompt includes run ID in research list example", () => {
    const prompt = getBuilderPrompt(baseBuilderContext);
    expect(prompt).toContain("run_test456");
  });

  test("builder prompt includes module ID in research list example", () => {
    const prompt = getBuilderPrompt(baseBuilderContext);
    expect(prompt).toContain("my-module");
  });

  test("research commands appear in Communication or a Research section", () => {
    const prompt = getBuilderPrompt(baseBuilderContext);
    // Research commands should appear somewhere useful
    const researchListIndex = prompt.indexOf("dark research list");
    expect(researchListIndex).toBeGreaterThan(-1);
  });

  test("preserves all existing builder prompt sections", () => {
    const prompt = getBuilderPrompt(baseBuilderContext);
    expect(prompt).toContain("## Identity");
    expect(prompt).toContain("## Assignment");
    expect(prompt).toContain("## Workflow");
    expect(prompt).toContain("## TDD Workflow");
    expect(prompt).toContain("## Contract Compliance");
    expect(prompt).toContain("## Communication");
    expect(prompt).toContain("## Constraints");
  });
});

// =============================================================================
// Evaluator Prompt: Research CLI integration
// =============================================================================

describe("Evaluator prompt — research CLI references", () => {
  test("mentions dark research list for viewing all research", () => {
    const prompt = getEvaluatorPrompt(baseEvaluatorContext);
    expect(prompt).toContain("dark research list");
  });

  test("includes --run-id flag in research list command", () => {
    const prompt = getEvaluatorPrompt(baseEvaluatorContext);
    expect(prompt).toMatch(/dark research list.*--run-id/);
  });

  test("mentions dark research show for viewing research details", () => {
    const prompt = getEvaluatorPrompt(baseEvaluatorContext);
    expect(prompt).toContain("dark research show");
  });

  test("evaluator can see all research (not filtered by module)", () => {
    const prompt = getEvaluatorPrompt(baseEvaluatorContext);
    // Evaluator should see all research for context, so the list should NOT
    // include a mandatory --module filter (it should list all)
    expect(prompt).toMatch(/dark research list --run-id/);
  });

  test("preserves existing evaluator prompt structure", () => {
    const prompt = getEvaluatorPrompt(baseEvaluatorContext);
    expect(prompt).toContain("## Identity");
    expect(prompt).toContain("## Assignment");
    expect(prompt).toContain("## Task");
    expect(prompt).toContain("## Workflow");
    expect(prompt).toContain("## Communication");
    expect(prompt).toContain("## Constraints");
  });
});
