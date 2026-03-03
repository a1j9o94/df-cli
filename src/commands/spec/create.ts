import { Command } from "commander";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { execSync } from "node:child_process";
import { findDfDir } from "../../utils/config.js";
import { getDb } from "../../db/index.js";
import { createSpec } from "../../db/queries/specs.js";
import { newSpecId } from "../../utils/id.js";
import { serializeFrontmatter } from "../../utils/frontmatter.js";
import { autoCommitFile } from "../../pipeline/auto-commit.js";
import { log } from "../../utils/logger.js";
import { gitCommitFile } from "../../utils/git-persistence.js";
import { createDefaultRegistry } from "../../importers/index.js";
import { importAndCreateSpec } from "../../importers/import-spec.js";
import { formatImportSummary } from "../../importers/format-summary.js";

interface CreateOptions {
  fromTemplate?: string;
  fromGithub?: string;
  fromJira?: string;
  fromLinear?: string;
  dryRun?: boolean;
  open?: boolean;
}

export const specCreateCommand = new Command("create")
  .description("Create a new specification")
  .argument("[title]", "Specification title (required unless importing from URL)")
  .option("--from-template <name>", "Create from a template")
  .option(
    "--from-github <url>",
    "Import from a GitHub issue URL (e.g., https://github.com/owner/repo/issues/123)",
  )
  .option(
    "--from-jira <url>",
    "Import from a Jira issue URL (not yet implemented)",
  )
  .option(
    "--from-linear <url>",
    "Import from a Linear issue URL (not yet implemented)",
  )
  .option("--dry-run", "Print spec content without writing to disk")
  .option("--open", "Open the spec in $EDITOR after creating")
  .action(async (title: string | undefined, options: CreateOptions) => {
    // Handle --from-github, --from-jira, --from-linear
    const importUrl =
      options.fromGithub ?? options.fromJira ?? options.fromLinear;

    if (importUrl) {
      await handleImport(importUrl, options);
      return;
    }

    // Original flow: create from title
    if (!title) {
      log.error(
        "Title is required. Usage: dark spec create <title> or dark spec create --from-github <url>",
      );
      process.exit(1);
    }

    await handleCreateFromTitle(title, options);
  });

async function handleImport(
  url: string,
  options: CreateOptions,
): Promise<void> {
  const dfDir = findDfDir();
  if (!dfDir) {
    log.error("Not in a Dark Factory project. Run 'df init' first.");
    process.exit(1);
  }

  const registry = createDefaultRegistry();

  try {
    const result = await importAndCreateSpec({
      url,
      dfDir,
      registry,
      dryRun: options.dryRun,
    });

    if (options.dryRun) {
      // Print content to stdout without writing
      console.log(result.content);
      return;
    }

    // Register in DB
    const db = getDb(join(dfDir, "state.db"));
    createSpec(db, result.specId, result.title, result.filePath);

    // Auto-commit
    const projectRoot = dirname(dfDir);
    const gitRelativePath = result.filePath;
    const commitResult = autoCommitFile(
      projectRoot,
      gitRelativePath,
      `Auto-commit: spec ${result.specId} imported from ${url}`,
    );
    if (commitResult.success) {
      log.info("  Spec committed to git history");
    }

    // Print summary
    const summary = formatImportSummary(result);
    console.log(summary);

    // Open in editor if requested
    if (options.open) {
      openInEditor(join(dfDir, "specs", `${result.specId}.md`));
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    // Check for gh CLI missing
    if (message.includes("gh") && message.includes("not found")) {
      log.error(
        "GitHub CLI (gh) required. Install: https://cli.github.com and run `gh auth login`",
      );
      process.exit(1);
    }

    log.error(message);
    process.exit(1);
  }
}

async function handleCreateFromTitle(
  title: string,
  options: CreateOptions,
): Promise<void> {
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

  // Auto-commit spec file to git (belt-and-suspenders: specs in both DB and git)
  const projectRoot = dirname(dfDir);
  const gitRelativePath = join(".df", filePath);
  const commitResult = autoCommitFile(
    projectRoot,
    gitRelativePath,
    `Auto-commit: spec ${id} created`,
  );
  if (commitResult.success) {
    log.info("  Spec committed to git history");
  }

  log.success(`Created spec: ${id}`);
  log.info(`  File: ${absPath}`);
  log.info(`  Edit the spec, then run: df build ${id}`);

  if (options.open) {
    openInEditor(absPath);
  }
}

function openInEditor(filePath: string): void {
  const editor = process.env.EDITOR ?? "vi";
  try {
    execSync(`${editor} "${filePath}"`, { stdio: "inherit" });
  } catch {
    log.warn(`Could not open editor: ${editor}`);
  }
}
