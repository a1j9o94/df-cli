import { Command } from "commander";
import { join } from "node:path";
import { findDfDir, getConfig } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { getSpec } from "../../db/queries/specs.js";
import { getActiveBuildplan, updateBuildplanStatus } from "../../db/queries/buildplans.js";
import { listRuns } from "../../db/queries/runs.js";
import { createAgent, updateAgentPid } from "../../db/queries/agents.js";
import { createEvent } from "../../db/queries/events.js";
import { createMessage } from "../../db/queries/messages.js";
import { ClaudeCodeRuntime } from "../../runtime/claude-code.js";
import { getArchitectPrompt } from "../../agents/prompts/architect.js";
import { log } from "../../utils/logger.js";

export const architectReviseCommand = new Command("revise")
  .description("Trigger a new architecture analysis with feedback")
  .argument("<spec-id>", "Specification ID")
  .requiredOption("--feedback <feedback>", "Feedback for the architect")
  .action(async (specId: string, options: { feedback: string }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project.");
      process.exit(1);
    }

    const db = getDb(join(dfDir, "state.db"));
    const config = getConfig(dfDir);

    const spec = getSpec(db, specId);
    if (!spec) {
      log.error(`Spec not found: ${specId}`);
      process.exit(1);
    }

    // Supersede current active buildplan
    const currentPlan = getActiveBuildplan(db, specId);
    if (currentPlan) {
      updateBuildplanStatus(db, currentPlan.id, "superseded");
    }

    // Find the most recent run for this spec
    const runs = listRuns(db, specId);
    if (runs.length === 0) {
      log.error("No runs found for this spec. Run 'df architect analyze' first.");
      process.exit(1);
    }
    const runId = runs[0].id;

    // Spawn new architect with feedback context
    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "architect",
      name: `architect-revision-${Date.now()}`,
      system_prompt: getArchitectPrompt({ specId, runId, agentId: "pending" }),
    });

    // Update prompt with actual agent ID
    const prompt = getArchitectPrompt({ specId, runId, agentId: agent.id });
    db.prepare("UPDATE agents SET system_prompt = ? WHERE id = ?").run(prompt, agent.id);

    // Send feedback as a message
    createMessage(db, runId, "orchestrator", `Revision requested. Feedback:\n\n${options.feedback}`, {
      toAgentId: agent.id,
    });

    createEvent(db, runId, "agent-spawned", { role: "architect", revision: true }, agent.id);

    const logsDir = join(dfDir, "logs");
    const runtime = new ClaudeCodeRuntime(config.runtime.agent_binary);
    const handle = await runtime.spawn({
      agent_id: agent.id,
      run_id: runId,
      role: "architect",
      name: agent.name,
      system_prompt: prompt,
    });

    updateAgentPid(db, agent.id, handle.pid);

    log.success(`Architect revision spawned: ${agent.id}`);
    log.info(`  Previous plan superseded: ${currentPlan?.id ?? "(none)"}`);
    log.info(`  Feedback sent as mail to architect`);
  });
