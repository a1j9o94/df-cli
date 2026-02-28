import { Command } from "commander";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { createSpec } from "../../db/queries/specs.js";
import { newSpecId } from "../../utils/id.js";
import { serializeFrontmatter } from "../../utils/frontmatter.js";
import { log } from "../../utils/logger.js";

export const specCreateCommand = new Command("create")
  .description("Create a new specification")
  .argument("<title>", "Specification title")
  .option("--from-template <name>", "Create from a template")
  .action(async (title: string, _options: { fromTemplate?: string }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project. Run 'df init' first.");
      process.exit(1);
    }

    const db = getDb(join(dfDir, "state.db"));
    const id = newSpecId();
    const fileName = `${id}.md`;
    const filePath = join("specs", fileName);
    const absPath = join(dfDir, filePath);

    const content = serializeFrontmatter(
      {
        id,
        title,
        type: "feature",
        status: "draft",
        version: "0.1.0",
        priority: "medium",
      },
      `# ${title}\n\n## Goal\n\nDescribe what this spec should accomplish.\n\n## Requirements\n\n- [ ] Requirement 1\n- [ ] Requirement 2\n\n## Scenarios\n\n### Functional\n\n1. **Scenario name**: Description of the test scenario.\n\n### Changeability\n\n1. **Modification scenario**: Description of a change that should be easy to make.\n`,
    );

    writeFileSync(absPath, content);
    createSpec(db, id, title, filePath);

    log.success(`Created spec: ${id}`);
    log.info(`  File: ${absPath}`);
    log.info(`  Edit the spec, then run: df build ${id}`);
  });
