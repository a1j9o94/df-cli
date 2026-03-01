import { Command } from "commander";
import { join } from "node:path";
import { findDfDir, getConfig } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { getSpec } from "../../db/queries/specs.js";
import { listRuns } from "../../db/queries/runs.js";
import { createRun } from "../../db/queries/runs.js";
import { createAgent, updateAgentPid } from "../../db/queries/agents.js";
import { createEvent } from "../../db/queries/events.js";
import { ClaudeCodeRuntime } from "../../runtime/claude-code.js";
import { getArchitectPrompt } from "../../agents/prompts/architect.js";
import { log } from "../../utils/logger.js";

export const architectAnalyzeCommand = new Command("analyze")
  .description("Spawn an Architect agent to analyze a spec")
  .argument("<spec-id>", "Specification ID to analyze")
  .option("--codebase-paths <paths>", "Comma-separated codebase paths to analyze")
  .option("--run-id <id>", "Attach to an existing run")
  .action(async (specId: string, options: { codebasePaths?: string; runId?: string }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project. Run 'df init' first.");
      process.exit(1);
    }

    const db = getDb(join(dfDir, "state.db"));
    const config = getConfig(dfDir);

    const spec = getSpec(db, specId);
    if (!spec) {
      log.error(`Spec not found: ${specId}`);
      process.exit(1);
    }

    // Get or create run
    let runId = options.runId;
    if (!runId) {
      const run = createRun(db, { spec_id: specId });
      runId = run.id;
    }

    const codebasePaths = options.codebasePaths?.split(",");

    const agent = createAgent(db, {
      agent_id: "",
      run_id: runId,
      role: "architect",
      name: `architect-${Date.now()}`,
      system_prompt: getArchitectPrompt({ specId, runId, agentId: "pending", codebasePaths }),
    });

    // Update prompt with actual agent ID
    const prompt = getArchitectPrompt({ specId, runId, agentId: agent.id, codebasePaths });
    db.prepare("UPDATE agents SET system_prompt = ? WHERE id = ?").run(prompt, agent.id);

    createEvent(db, runId, "agent-spawned", { role: "architect" }, agent.id);

    const runtime = new ClaudeCodeRuntime(config.runtime.agent_binary);
    const handle = await runtime.spawn({
      agent_id: agent.id,
      run_id: runId,
      role: "architect",
      name: agent.name,
      system_prompt: prompt,
    });

    updateAgentPid(db, agent.id, handle.pid);

    log.success(`Architect agent spawned: ${agent.id}`);
    log.info(`  Run:  ${runId}`);
    log.info(`  PID:  ${handle.pid}`);
    log.info(`  The architect will submit its buildplan via: df architect submit-plan ${agent.id} --plan <json>`);
  });
