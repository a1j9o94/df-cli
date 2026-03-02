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
      body = buildBuilderBody(agentId, context);
      break;
    }

    case "evaluator": {
      body = buildEvaluatorBody(agentId);
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
    "",
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
    "If you cannot complete this work, call:",
    `dark agent fail ${agentId} --error "<description>"`,
  ].join("\n");
}

function buildBuilderBody(agentId: string, context: Record<string, unknown>): string {
  const moduleId = context.moduleId as string;
  const worktreePath = context.worktreePath as string;
  const contracts = context.contracts as string[] | undefined;
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
    `## Worktree: ${worktreePath}`,
    scope ? `## Scope:` : "",
    scope?.creates?.length ? `- Creates: ${scope.creates.join(", ")}` : "",
    scope?.modifies?.length ? `- Modifies: ${scope.modifies.join(", ")}` : "",
    scope?.test_files?.length ? `- Tests: ${scope.test_files.join(", ")}` : "",
    contracts?.length ? `## Contracts: ${contracts.join(", ")}` : "",
    "",
    preloadSection,
    "",
    "## Steps",
    "1. Read this assignment and understand your module scope",
    "2. Follow TDD: write a failing test, make it pass, refactor",
    "3. Implement all functionality defined in your module scope",
    "4. Commit your work in the worktree",
    `5. Mark yourself complete: dark agent complete ${agentId}`,
    "",
    "If you cannot complete this work, call:",
    `dark agent fail ${agentId} --error "<description>"`,
  ].join("\n");
}

function buildEvaluatorBody(agentId: string): string {
  return [
    "# Evaluator Instructions",
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
    `5. Report your results: dark agent report-result ${agentId} --passed <true|false> --score <0.0-1.0>`,
    `6. Mark yourself complete: dark agent complete ${agentId}`,
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
