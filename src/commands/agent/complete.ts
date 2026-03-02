import { Command } from "commander";
import { execSync } from "node:child_process";
import { readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { getAgent, updateAgentStatus } from "../../db/queries/agents.js";
import { getRun } from "../../db/queries/runs.js";
import { listBuildplans } from "../../db/queries/buildplans.js";
import { listEvents } from "../../db/queries/events.js";
import { createEvent } from "../../db/queries/events.js";
import { recordCost } from "../../pipeline/budget.js";
import { checkMergerGuards } from "../../pipeline/merger-guards.js";
import { log } from "../../utils/logger.js";

export const agentCompleteCommand = new Command("complete")
  .description("Mark an agent as completed")
  .argument("<agent-id>", "Agent ID")
  .option("--cost <usd>", "Report accumulated cost in USD")
  .option("--tokens <n>", "Report accumulated token usage")
  .action(async (agentId: string, options: { cost?: string; tokens?: string }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project.");
      process.exit(1);
    }

    const db = getDb(join(dfDir, "state.db"));
    const agent = getAgent(db, agentId);

    if (!agent) {
      log.error(`Agent not found: ${agentId}`);
      process.exit(1);
    }

    // Role-specific completion guards
    const guardError = checkCompletionGuard(db, dfDir, agent);
    if (guardError) {
      log.error(`Cannot complete: ${guardError}`);
      log.error("Finish your required work before calling complete.");
      process.exit(1);
    }

    if (options.cost || options.tokens) {
      const costUsd = options.cost ? parseFloat(options.cost) : 0;
      const tokens = options.tokens ? parseInt(options.tokens, 10) : 0;
      recordCost(db, agent.run_id, agentId, costUsd, tokens);
    }

    updateAgentStatus(db, agentId, "completed");
    createEvent(db, agent.run_id, "agent-completed", undefined, agentId);
    log.success(`Agent ${agentId} marked as completed`);
  });

function checkCompletionGuard(
  db: ReturnType<typeof getDb>,
  dfDir: string,
  agent: NonNullable<ReturnType<typeof getAgent>>,
): string | null {
  switch (agent.role) {
    case "architect": {
      // Architect must have submitted an active buildplan
      const plans = listBuildplans(db, agent.run_id);
      const myPlans = plans.filter((p) => p.architect_agent_id === agent.id);
      if (myPlans.length === 0) {
        return `No buildplan submitted. You must call: dark architect submit-plan ${agent.id} --plan '<json>' before completing.`;
      }
      const hasActive = myPlans.some((p) => p.status === "active");
      if (!hasActive) {
        return "Buildplan was submitted but not activated. Check validation errors.";
      }

      // Architect must have created at least one holdout scenario
      const scenarioDir = join(dfDir, "scenarios");
      let scenarioCount = 0;
      for (const type of ["functional", "change"]) {
        const typeDir = join(scenarioDir, type);
        if (existsSync(typeDir)) {
          scenarioCount += readdirSync(typeDir).filter((f) => f.endsWith(".md")).length;
        }
      }
      if (scenarioCount === 0) {
        return `No holdout scenarios created. You must call: dark scenario create ${agent.id} --name "<name>" --type <functional|change> --content "<content>" before completing.`;
      }

      return null;
    }

    case "builder": {
      // Builder must have changed at least one file in its worktree
      if (!agent.worktree_path || agent.worktree_path === ".") {
        return null; // Can't enforce without worktree isolation
      }
      try {
        const diff = execSync("git diff --stat HEAD", {
          cwd: agent.worktree_path,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        }).trim();
        const diffCached = execSync("git diff --cached --stat HEAD", {
          cwd: agent.worktree_path,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        }).trim();
        const untracked = execSync("git ls-files --others --exclude-standard", {
          cwd: agent.worktree_path,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        }).trim();

        if (!diff && !diffCached && !untracked) {
          return "No files changed in worktree. You must write code before completing.";
        }
      } catch {
        return null; // If git commands fail, don't block completion
      }
      return null;
    }

    case "evaluator": {
      // Evaluator must have reported results via `dark agent report-result`
      const evalEvents = listEvents(db, agent.run_id, { agentId: agent.id });
      const hasResult = evalEvents.some(
        (e) => e.type === "evaluation-passed" || e.type === "evaluation-failed",
      );
      if (!hasResult) {
        return `No evaluation results reported. You must call: dark agent report-result ${agent.id} --passed <true|false> --score <0.0-1.0> before completing.`;
      }
      return null;
    }

    case "integration-tester": {
      // Integration tester must have reported results
      const intEvents = listEvents(db, agent.run_id, { agentId: agent.id });
      const hasResult = intEvents.some(
        (e) => e.type === "integration-passed" || e.type === "integration-failed",
      );
      if (!hasResult) {
        return `No integration test results reported. You must call: dark agent report-result ${agent.id} --passed <true|false> --score <0.0-1.0> before completing.`;
      }
      return null;
    }

    case "merger": {
      // Merger must have created new commits on the target branch
      const run = getRun(db, agent.run_id);
      if (!run) return "Run not found";

      const projectRoot = dirname(dfDir);
      try {
        // Check if there are commits after the run started
        const newCommits = execSync(
          `git log --oneline --after="${run.created_at}" HEAD`,
          { cwd: projectRoot, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
        ).trim();

        if (!newCommits) {
          return "No new commits on target branch. You must merge builder worktree branches before completing.";
        }
      } catch {
        return null; // If git commands fail, don't block completion
      }

      // Run merger guards: tests, conflict markers, state DB check
      const guardResult = checkMergerGuards(projectRoot, dfDir);
      if (!guardResult.passed) {
        return `Merger guards failed:\n${guardResult.errors.map((e) => `  - ${e}`).join("\n")}`;
      }

      return null;
    }

    default:
      return null;
  }
}
