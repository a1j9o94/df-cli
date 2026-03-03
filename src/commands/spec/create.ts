import { Command } from "commander";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { createSpec } from "../../db/queries/specs.js";
import { newSpecId } from "../../utils/id.js";
import { serializeFrontmatter } from "../../utils/frontmatter.js";
import { autoCommitFile } from "../../pipeline/auto-commit.js";
import { log } from "../../utils/logger.js";
import { gitCommitFile } from "../../utils/git-persistence.js";
import { executeSpecCreateFrom } from "./create-from.js";

export const specCreateCommand = new Command("create")
  .description("Create a new specification")
  .argument("<title>", "Specification title")
  .option("--from-template <name>", "Create from a template")
  .option("--from <spec-id>", "Create derived from an existing spec (copies content, sets parent reference)")
  .action(async (title: string, options: { fromTemplate?: string; from?: string }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project. Run 'df init' first.");
      process.exit(1);
    }

    const db = getDb(join(dfDir, "state.db"));

    // Handle --from: derive from existing spec
    if (options.from) {
      try {
        const spec = executeSpecCreateFrom(db, dfDir, title, options.from);

        // Auto-commit
        const projectRoot = dirname(dfDir);
        const gitRelativePath = join(".df", spec.file_path);
        const commitResult = autoCommitFile(
          projectRoot,
          gitRelativePath,
          `Auto-commit: spec ${spec.id} created from ${options.from}`,
        );
        if (commitResult.success) {
          log.info("  Spec committed to git history");
        }

        log.success(`Created spec: ${spec.id}`);
        log.info(`  Title:  ${spec.title}`);
        log.info(`  Parent: ${options.from}`);
        log.info(`  File:   ${join(dfDir, spec.file_path)}`);
        log.info(`  Edit the spec, then run: dark build ${spec.id}`);
      } catch (err) {
        log.error((err as Error).message);
        process.exit(1);
      }
      return;
    }

    // Standard spec creation (no parent)
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

    // Auto-commit spec file to git (belt-and-suspenders: specs in both DB and git)
    const projectRoot = dirname(dfDir);
    const gitRelativePath = join(".df", filePath);
    const commitResult = autoCommitFile(projectRoot, gitRelativePath, `Auto-commit: spec ${id} created`);
    if (commitResult.success) {
      log.info("  Spec committed to git history");
    }

    log.success(`Created spec: ${id}`);
    log.info(`  File: ${absPath}`);
    log.info(`  Edit the spec, then run: dark build ${id}`);
  });
