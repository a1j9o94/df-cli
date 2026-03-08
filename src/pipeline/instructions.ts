/**
 * Instruction mail builders for each agent role.
 *
 * Extracted from PipelineEngine.sendInstructions() to keep engine.ts small.
 * Each role gets a structured mail body that tells the agent exactly what to do.
 */

import { readFileSync } from "node:fs";
import type { SqliteDb } from "../db/index.js";
import { createMessage } from "../db/queries/messages.js";
import { extractFileContents, formatPreloadedFiles } from "./file-preload.js";
import {
  detectVideoUrls,
  buildVideoReferencesSection,
} from "../commands/research/video-detect.js";

// ============================================================
// Conflict resolution prompt types and builder
// ============================================================

/**
 * A file with git conflict markers that needs resolution.
 */
export interface ConflictedFile {
  /** Relative file path (e.g. "src/shared/greet.ts") */
  path: string;
  /** Full file content including conflict markers (<<<<<<< / ======= / >>>>>>>) */
  content: string;
}

/**
 * Context for building a conflict resolution prompt.
 */
export interface ConflictPromptContext {
  /** The merger agent ID that will resolve the conflicts */
  agentId: string;
  /** The current pipeline run ID */
  runId: string;
  /** The branch being merged into (e.g. "main") */
  targetBranch: string;
  /** Name of the module whose code is on the HEAD side (already merged) */
  headModuleName: string;
  /** Name of the module whose code is on the incoming side (being merged) */
  incomingModuleName: string;
  /** The branch name being merged in */
  incomingBranch: string;
  /** List of files with conflict markers */
  conflictedFiles: ConflictedFile[];
}

/**
 * Build a conflict resolution prompt for the merger agent.
 *
 * When a `git merge --no-commit` produces conflicts, the merge phase
 * calls this function to construct instructions that tell the merger
 * agent exactly what files are conflicted, which module produced each
 * side of the conflict, and how to resolve and commit the result.
 *
 * @param context - Conflict details including files, module names, and agent info
 * @returns A structured prompt string for the merger agent
 */
export function buildConflictResolutionPrompt(context: ConflictPromptContext): string {
  const {
    agentId,
    runId,
    targetBranch,
    headModuleName,
    incomingModuleName,
    incomingBranch,
    conflictedFiles,
  } = context;

  const fileCount = conflictedFiles.length;
  const fileSummary = fileCount === 0
    ? "No conflicted files detected."
    : `${fileCount} file${fileCount === 1 ? "" : "s"} with conflicts:`;

  // Build per-file sections with conflict content
  const fileSections = conflictedFiles.map((file, index) => {
    return [
      `### File ${index + 1}: ${file.path}`,
      "",
      "```",
      file.content,
      "```",
    ].join("\n");
  }).join("\n\n");

  return [
    "# Conflict Resolution Instructions",
    "",
    "## Identity",
    "You are a Merger agent resolving git merge conflicts between two modules in a Dark Factory pipeline.",
    "Both sides of each conflict represent intentional changes from different builders — your job is to combine them correctly.",
    "",
    "## Assignment",
    `- Run: ${runId}`,
    `- Agent ID: ${agentId}`,
    `- Target branch: ${targetBranch}`,
    `- Incoming branch: ${incomingBranch}`,
    `- HEAD side (already merged): **${headModuleName}**`,
    `- Incoming side (being merged): **${incomingModuleName}**`,
    "",
    "## Context",
    "",
    `The HEAD side (\`<<<<<<< HEAD\`) contains code from module **${headModuleName}** which was already merged into \`${targetBranch}\`.`,
    `The incoming side (\`>>>>>>>\`) contains code from module **${incomingModuleName}** which is being merged from branch \`${incomingBranch}\`.`,
    "",
    "**Both changes are intentional** — they come from separate builders working on different modules.",
    "You must combine both sides into a coherent result. Do not drop or discard either side's changes.",
    "Preserve both sides' intent: keep all new functions, imports, exports, and modifications from each module.",
    "",
    "## Conflicted Files",
    "",
    fileSummary,
    "",
    fileSections,
    "",
    "## Resolution Steps",
    "",
    "For each conflicted file above:",
    "",
    "1. **Read** the conflict markers carefully — understand what each side added or changed",
    "2. **Resolve** the conflict by combining both sides. Remove all conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)",
    "3. **Verify** the resolved file is syntactically valid and logically coherent",
    "4. **Stage** the resolved file: `git add <file-path>`",
    "",
    "After resolving ALL files:",
    "",
    `5. **Commit** the merge resolution: \`git commit -m "Merge ${incomingModuleName} into ${targetBranch}: resolve conflicts with ${headModuleName}"\``,
    `6. **Verify** no conflict markers remain in any tracked file: \`git grep -l '<<<<<<<' || echo 'No conflict markers found'\``,
    `7. Mark yourself complete: \`dark agent complete ${agentId}\``,
    "",
    "## IMPORTANT",
    "",
    "- **Do NOT drop either side's changes.** Both modules' changes are intentional and must be preserved.",
    "- **Remove ALL conflict markers.** No `<<<<<<<`, `=======`, or `>>>>>>>` should remain in any file after resolution.",
    "- If a conflict cannot be resolved automatically (e.g., contradictory logic), escalate via:",
    `  \`dark mail send --to @orchestrator --body "Cannot resolve conflict in <file>: <reason>" --from ${agentId} --run-id ${runId}\``,
    "",
    "## Communication",
    `- Check messages: dark mail check --agent ${agentId}`,
    `- Send messages: dark mail send --to <target> --body "..." --from ${agentId} --run-id ${runId}`,
    `- Heartbeat: dark agent heartbeat ${agentId}`,
    `- Complete: dark agent complete ${agentId}`,
    `- Fail: dark agent fail ${agentId} --error "<description>"`,
  ].join("\n");
}

/**
 * Send actionable instructions to an agent via the mail system.
 *
 * Builds a role-specific mail body and persists it as a message from
 * the orchestrator to the target agent.
 */
export function sendInstructions(
  db: SqliteDb,
  runId: string,
  agentId: string,
  role: string,
  context: Record<string, unknown>,
): void {
  let body: string;

  switch (role) {
    case "architect": {
      body = buildArchitectBody(agentId, context);
      break;
    }

    case "builder": {
      body = buildBuilderBody(agentId, runId, context);
      break;
    }

    case "evaluator": {
      body = buildEvaluatorBody(agentId, runId);
      break;
    }

    case "merger": {
      body = buildMergerBody(agentId, context);
      break;
    }

    case "integration-tester": {
      body = buildIntegrationTesterBody(agentId);
      break;
    }

    case "conflict-resolution": {
      body = buildConflictResolutionPrompt({
        agentId,
        runId,
        targetBranch: (context.targetBranch as string) ?? "main",
        headModuleName: (context.headModuleName as string) ?? "unknown",
        incomingModuleName: (context.incomingModuleName as string) ?? "unknown",
        incomingBranch: (context.incomingBranch as string) ?? "unknown",
        conflictedFiles: (context.conflictedFiles as ConflictedFile[]) ?? [],
      });
      break;
    }

    default:
      body = `Complete your ${role} task, then call: dark agent complete ${agentId}`;
  }

  createMessage(db, runId, "orchestrator", body, { toAgentId: agentId });
}

// ============================================================
// Role-specific body builders
// ============================================================

function buildArchitectBody(agentId: string, context: Record<string, unknown>): string {
  const specFilePath = context.specFilePath as string | undefined;
  let specContent = "";
  if (specFilePath) {
    try {
      specContent = readFileSync(specFilePath, "utf-8");
    } catch {
      specContent = `(Could not read spec file: ${specFilePath})`;
    }
  }

  // Detect video URLs in spec content and build references section
  const videoUrls = specContent ? detectVideoUrls(specContent) : [];
  const videoSection = buildVideoReferencesSection(videoUrls, agentId);

  return [
    "# Architect Instructions",
    "",
    "## Your Task",
    "Analyze the specification below, decompose it into buildable modules, and create holdout test scenarios.",
    "",
    "## Spec Content",
    "```",
    specContent || "(No spec content available — check the spec file manually)",
    "```",
    videoSection,
    "## Steps",
    `1. Read and analyze the spec above`,
    `2. Decompose into modules with clear boundaries and interface contracts`,
    `3. Create holdout test scenarios from the spec's Scenarios section:`,
    `   dark scenario create ${agentId} --name "<name>" --type functional --content "<detailed test steps>"`,
    `   dark scenario create ${agentId} --name "<name>" --type change --content "<modification description>"`,
    `4. Submit your buildplan: dark architect submit-plan ${agentId} --plan '<json>'`,
    `5. Mark yourself complete: dark agent complete ${agentId}`,
    "",
    "IMPORTANT: You MUST create at least one scenario AND submit a buildplan before completing.",
    "Scenarios are holdout tests that builders never see — the evaluator uses them to validate the build.",
    "",
    "## Research",
    "Save research findings for other agents to reference:",
    `- Save text: dark research add ${agentId} --label "<label>" --content "<URL, code snippet, API docs excerpt, or decision rationale>" [--module <module-id>]`,
    `- Save file: dark research add ${agentId} --label "<label>" --file <path> [--module <module-id>]`,
    `- Fetch video: dark research video ${agentId} <url> [--question "<question>"] [--module <module-id>]`,
    "",
    "If you cannot complete this work, call:",
    `dark agent fail ${agentId} --error "<description>"`,
  ].join("\n");
}

function buildBuilderBody(agentId: string, runId: string, context: Record<string, unknown>): string {
  const moduleId = context.moduleId as string;
  const worktreePath = context.worktreePath as string;
  const contracts = context.contracts as string[] | undefined;
  const targetProject = context.targetProject as string | undefined;
  const scope = context.scope as
    | { creates?: string[]; modifies?: string[]; test_files?: string[] }
    | undefined;

  // Pre-load file contents for files the builder needs to modify.
  // This prevents builders from wasting context window turns reading files.
  let preloadSection = "";
  if (scope?.modifies?.length && worktreePath) {
    const normalizedScope = {
      creates: scope.creates || [],
      modifies: scope.modifies,
      test_files: scope.test_files || [],
    };
    const preloadedFiles = extractFileContents(normalizedScope, worktreePath);
    const formattedFiles = formatPreloadedFiles(preloadedFiles);
    if (formattedFiles) {
      preloadSection = `## Pre-loaded Files\n\nThe following files from your scope are pre-loaded to save you context. You do NOT need to read these files — they are already here.\n\n${formattedFiles}`;
    }
  }

  return [
    "# Builder Instructions",
    "",
    `## Module: ${moduleId}`,
    targetProject ? `## Target Project: ${targetProject}` : "",
    `## Worktree: ${worktreePath}`,
    scope ? `## Scope:` : "",
    scope?.creates?.length ? `- Creates: ${scope.creates.join(", ")}` : "",
    scope?.modifies?.length ? `- Modifies: ${scope.modifies.join(", ")}` : "",
    scope?.test_files?.length ? `- Tests: ${scope.test_files.join(", ")}` : "",
    contracts?.length ? `## Contracts: ${contracts.join(", ")}` : "",
    "",
    preloadSection,
    "",
    "## Research",
    "Check for architect research findings relevant to your module:",
    `- List research: dark research list --run-id ${runId} --module ${moduleId}`,
    `- View details: dark research show <research-id>`,
    "",
    "## Steps",
    "1. Read this assignment and understand your module scope",
    "2. Follow TDD: write a failing test, make it pass, refactor",
    "3. Implement all functionality defined in your module scope",
    "4. Commit your work in the worktree",
    `5. Mark yourself complete: dark agent complete ${agentId}`,
    "",
    "## CRITICAL — Completion Required",
    "",
    `Your work is on a **staging branch**. It will NOT be merged until you call \`dark agent complete ${agentId}\`.`,
    "",
    `**CRITICAL: You MUST call \`dark agent complete ${agentId}\` as your FINAL action. Without this call, your work will NOT be merged.**`,
    "",
    "If you cannot complete this work, call:",
    `dark agent fail ${agentId} --error "<description>"`,
  ].join("\n");
}

function buildEvaluatorBody(agentId: string, runId: string): string {
  return [
    "# Evaluator Instructions",
    "",
    "## Research",
    "Review architect research findings for additional context:",
    `- List all research: dark research list --run-id ${runId}`,
    `- View details: dark research show <research-id>`,
    "",
    "## Holdout Scenarios",
    "List available scenarios: dark scenario list --json",
    "Scenarios are in .df/scenarios/functional/ and .df/scenarios/change/",
    "Read each scenario file to get test steps, inputs, and expected outputs.",
    "",
    "## Steps",
    "1. List scenarios: dark scenario list",
    "2. Read each scenario file from .df/scenarios/",
    "3. Execute each scenario against the integrated code",
    "4. Score each scenario: pass (1.0) or fail (0.0)",
    `5. Between scenarios, heartbeat: dark agent heartbeat ${agentId}`,
    `6. Report your results: dark agent report-result ${agentId} --passed <true|false> --score <0.0-1.0>`,
    `7. Mark yourself complete: dark agent complete ${agentId}`,
    "",
    "IMPORTANT: You MUST call report-result before complete. Complete will reject without results.",
    "",
    "If you cannot complete this work, call:",
    `dark agent fail ${agentId} --error "<description>"`,
  ].join("\n");
}

function buildMergerBody(agentId: string, context: Record<string, unknown>): string {
  const worktreePaths = context.worktreePaths as string[] | undefined;
  return [
    "# Merger Instructions",
    "",
    worktreePaths?.length
      ? `## Worktrees to merge: ${worktreePaths.join(", ")}`
      : "## No worktrees specified",
    "",
    "## Steps",
    "1. Merge each worktree branch into the target branch in dependency order",
    "2. Resolve any simple conflicts automatically",
    "3. Run all tests post-merge",
    "4. Commit the merged result to the target branch",
    `5. Mark yourself complete: dark agent complete ${agentId}`,
    "",
    "IMPORTANT: You MUST create at least one commit on the target branch before complete. Complete will reject without new commits.",
    "",
    "If you cannot complete this work, call:",
    `dark agent fail ${agentId} --error "<description>"`,
  ].join("\n");
}

function buildIntegrationTesterBody(agentId: string): string {
  return [
    "# Integration Tester Instructions",
    "",
    "## Steps",
    "1. Run integration tests across all merged modules",
    "2. Verify cross-module contracts are satisfied",
    `3. Report your results: dark agent report-result ${agentId} --passed <true|false> --score <0.0-1.0>`,
    `4. Mark yourself complete: dark agent complete ${agentId}`,
    "",
    "IMPORTANT: You MUST call report-result before complete. Complete will reject without results.",
    "",
    "If you cannot complete this work, call:",
    `dark agent fail ${agentId} --error "<description>"`,
  ].join("\n");
}
