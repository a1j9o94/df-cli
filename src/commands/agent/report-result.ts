import { Command } from "commander";
import { join } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { getAgent } from "../../db/queries/agents.js";
import { createEvent } from "../../db/queries/events.js";
import { estimateAndRecordCost } from "../../pipeline/budget.js";
import { log } from "../../utils/logger.js";

export const agentReportResultCommand = new Command("report-result")
  .description("Report evaluation or integration test results (called by evaluator/integration-tester agents)")
  .argument("<agent-id>", "Agent ID")
  .requiredOption("--passed <bool>", "Whether the evaluation passed (true/false)")
  .option("--score <n>", "Numeric score (0.0 to 1.0)")
  .option("--details <json>", "JSON details about the results")
  .action(async (agentId: string, options: { passed: string; score?: string; details?: string }) => {
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

    // Estimate cost on every agent command
    estimateAndRecordCost(db, agentId);

    if (agent.role !== "evaluator" && agent.role !== "integration-tester") {
      log.error(`Agent ${agentId} is not an evaluator or integration-tester (role: ${agent.role})`);
      process.exit(1);
    }

    const passed = options.passed === "true";
    const score = options.score ? parseFloat(options.score) : (passed ? 1.0 : 0.0);

    let details: Record<string, unknown> = {};
    if (options.details) {
      try {
        details = JSON.parse(options.details);
      } catch {
        log.error("Invalid JSON in --details");
        process.exit(1);
      }
    }

    const eventType = agent.role === "evaluator"
      ? (passed ? "evaluation-passed" : "evaluation-failed")
      : (passed ? "integration-passed" : "integration-failed");

    createEvent(db, agent.run_id, eventType as any, {
      score,
      passed,
      ...details,
    }, agentId);

    log.success(`Result reported: ${eventType} (score=${score.toFixed(2)})`);
  });
