import { Command } from "commander";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { getSpec } from "../../db/queries/specs.js";
import { createSpecFrom as dbCreateSpecFrom } from "../../db/queries/spec-lineage.js";
import { newSpecId } from "../../utils/id.js";
import { parseFrontmatter, serializeFrontmatter } from "../../utils/frontmatter.js";
import { autoCommitFile } from "../../pipeline/auto-commit.js";
import { log } from "../../utils/logger.js";
import type { SqliteDb } from "../../db/index.js";
import type { SpecRecord } from "../../types/index.js";

/**
 * Core logic for creating a spec from a parent. Testable without Commander.
 */
export function executeSpecCreateFrom(
  db: SqliteDb,
  dfDir: string,
  title: string,
  parentSpecId: string,
): SpecRecord {
  // Validate parent exists in DB
  const parent = getSpec(db, parentSpecId);
  if (!parent) {
    throw new Error(`Parent spec not found: ${parentSpecId}`);
  }

  // Read parent spec file from disk
  const parentFilePath = join(dfDir, parent.file_path);
  let parentContent: string;
  try {
    parentContent = readFileSync(parentFilePath, "utf-8");
  } catch {
    throw new Error(`Parent spec file not found on disk: ${parentFilePath}`);
  }

  // Parse parent content
  const { body } = parseFrontmatter(parentContent);

  // Generate new spec
  const id = newSpecId();
  const fileName = `${id}.md`;
  const filePath = `specs/${fileName}`;
  const absPath = join(dfDir, filePath);

  // Build new frontmatter with parent reference
  const newContent = serializeFrontmatter(
    {
      id,
      title,
      type: "feature",
      status: "draft",
      version: "0.1.0",
      priority: "medium",
      parent_spec_id: parentSpecId,
    },
    body,
  );

  // Write file
  writeFileSync(absPath, newContent);

  // Create DB record
  const spec = dbCreateSpecFrom(db, id, title, filePath, parentSpecId);

  return spec;
}

/**
 * Commander command that wires up the `dark spec create --from <spec-id>` option.
 * This extends the existing create command behavior.
 */
export const specCreateFromCommand = new Command("create-from")
  .description("Create a new specification derived from an existing spec")
  .argument("<title>", "Specification title")
  .requiredOption("--from <spec-id>", "Parent spec ID to derive from")
  .action(async (title: string, options: { from: string }) => {
    const dfDir = findDfDir();
    if (!dfDir) {
      log.error("Not in a Dark Factory project. Run 'dark init' first.");
      process.exit(1);
    }

    const db = getDb(join(dfDir, "state.db"));

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
  });
