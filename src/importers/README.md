# Issue Importers

Pluggable architecture for importing issues from external trackers into dark specs.

## Architecture

- `types.ts` — Core interfaces: `IssueData`, `Comment`, `IssueImporter`
- `registry.ts` — `ImporterRegistry` for registering and resolving importers
- `label-mapper.ts` — Maps issue labels to spec type/priority
- `spec-generator.ts` — Generates spec markdown from `IssueData`
- `import-spec.ts` — Orchestrates the full import pipeline
- `format-summary.ts` — Formats human-readable import summary for CLI
- `stubs.ts` — Stub importers for Jira and Linear
- `index.ts` — Barrel exports and `createDefaultRegistry()`

## GitHub Importer

- `github/url-parser.ts` — Parses GitHub issue URLs
- `github/importer.ts` — `GitHubIssueImporter` using `gh` CLI

## Adding a New Importer

1. Implement the `IssueImporter` interface
2. Register it in `createDefaultRegistry()` in `index.ts`
3. Add the CLI flag in `src/commands/spec/create.ts`

No changes to spec generation logic are needed.
