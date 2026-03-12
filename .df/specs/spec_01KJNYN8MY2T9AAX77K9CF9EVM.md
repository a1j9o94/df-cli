---
id: spec_01KJNYN8MY2T9AAX77K9CF9EVM
title: "Spec from GitHub issue: generate draft specs from issue URLs"
type: feature
status: completed
version: 0.1.0
priority: medium
---

# Spec from GitHub issue: generate draft specs from issue URLs

## Goal

`dark spec create --from-github <issue-url>` reads a GitHub issue and generates a draft spec from it. This bridges existing issue trackers into dark without manual transcription. Teams already track work in GitHub Issues — dark should consume that directly instead of requiring duplicate spec authoring.

## Problem

Today, creating a spec from an existing GitHub issue requires manually reading the issue, opening a terminal, running `dark spec create`, and copy-pasting the relevant content into the generated spec file. For teams with hundreds of issues, this is a bottleneck to adoption. The information is already structured (title, description, labels, acceptance criteria) — dark should extract it automatically.

## Requirements

### Module 1: GitHub Issue Fetcher

- `dark spec create --from-github <url>` — accepts a GitHub issue URL in the form `https://github.com/<owner>/<repo>/issues/<number>`
- Uses `gh api repos/<owner>/<repo>/issues/<number>` to fetch issue data (leverages existing `gh` CLI authentication)
- Also fetches `gh api repos/<owner>/<repo>/issues/<number>/comments` to capture discussion context
- If `gh` is not installed or not authenticated, exit with a clear error: "GitHub CLI (gh) required. Install: https://cli.github.com and run `gh auth login`"
- Parse the URL to extract owner, repo, and issue number — reject malformed URLs with a helpful error

### Module 2: Spec Generation from Issue Data

- Map issue fields to spec structure:

| Issue Field | Spec Field |
|-------------|------------|
| `title` | `title` in frontmatter and `# heading` |
| `body` first paragraph (or `## Description` section) | `## Goal` |
| `body` checkbox lists (`- [ ] item`) | `## Requirements` (as bullet list) |
| `body` numbered lists | `## Requirements` (as bullet list) |
| `body` `## Acceptance Criteria` section | `## Scenarios > Functional` |
| `body` `## Test Cases` section | `## Scenarios > Functional` |
| `labels` | `type` and `priority` in frontmatter (see label mapping) |
| Issue URL | `source_url` in frontmatter |

- Label mapping:
  - `bug` / `bugfix` / `defect` → `type: bug`
  - `enhancement` / `feature` / `feature-request` → `type: feature`
  - `p0` / `critical` / `urgent` → `priority: critical`
  - `p1` / `high` → `priority: high`
  - `p2` / `medium` → `priority: medium`
  - `p3` / `low` → `priority: low`
  - Unrecognized labels: ignored (not mapped)

- If the issue body has no structured sections, use the entire body as the Goal and leave Requirements and Scenarios as placeholders

- Generated spec always has `status: draft` — the user reviews and edits before building

### Module 3: Comment Extraction (Optional Enrichment)

- If the issue has comments, append a `## Context from Discussion` section at the end of the spec
- Include comments from issue author and maintainers (skip bot comments)
- Each comment: author name, date, first 500 chars of content
- Maximum 5 comments included (most recent, skip duplicates)
- This section is informational — it helps the architect understand intent but isn't part of the formal spec

### Module 4: Pluggable Importer Architecture

- The GitHub importer is one implementation of an `IssueImporter` interface:
  ```
  interface IssueImporter {
    canHandle(url: string): boolean
    fetch(url: string): Promise<IssueData>
  }

  interface IssueData {
    title: string
    body: string
    labels: string[]
    comments: Comment[]
    sourceUrl: string
  }
  ```
- `--from-jira <url>` and `--from-linear <url>` are documented as future extension points in the `--help` output but return "Not yet implemented. See: dark spec create --from-github" for now
- Adding a new importer should require: implementing `IssueImporter`, registering it in the importer registry, adding the CLI flag — no changes to spec generation logic

### Module 5: Output and Confirmation

- After generating, print the spec file path and a summary:
  ```
  Created spec: .df/specs/spec_01KJP....md
  Title: Fix authentication redirect loop
  Type: bug (from label: bug)
  Priority: high (from label: p1)
  Source: https://github.com/org/repo/issues/123
  Requirements: 4 extracted
  Scenarios: 2 extracted from acceptance criteria

  Review and edit: dark spec edit spec_01KJP...
  Build when ready: dark build spec_01KJP...
  ```
- `--dry-run` flag: print what the spec would contain without writing the file
- `--open` flag: after creating, open the spec in `$EDITOR`

## Scenarios

### Functional

1. **Import public issue**: `dark spec create --from-github https://github.com/org/repo/issues/123` where the issue has a title, description, and 3 checkbox requirements. Verify spec is created with matching title, goal from description, and 3 requirements.

2. **Import with labels**: Issue has labels `bug` and `p0`. Verify generated spec has `type: bug` and `priority: critical` in frontmatter.

3. **Issue with acceptance criteria**: Issue body contains `## Acceptance Criteria` with 3 checkboxes. Verify these become 3 scenarios in the `## Scenarios > Functional` section.

4. **Source URL preserved**: Verify `source_url: https://github.com/org/repo/issues/123` appears in the spec frontmatter.

5. **Private repo access**: Issue is in a private repo. Verify it works when `gh` is authenticated with access to that repo.

6. **Unstructured issue body**: Issue has a plain text body with no sections, checkboxes, or headers. Verify the entire body becomes the Goal section, and Requirements/Scenarios are placeholders.

7. **Dry run**: `dark spec create --from-github <url> --dry-run`. Verify spec content is printed to stdout but no file is created on disk.

8. **Missing gh CLI**: `gh` is not installed. Verify a clear error message with installation instructions.

### Changeability

1. **Add Jira importer**: Implementing `--from-jira` should require creating a `JiraImporter` class that implements `IssueImporter`, registering it, and adding the CLI flag — no changes to spec generation or the existing GitHub importer.

2. **Add custom label mapping**: Allowing users to define custom label-to-type/priority mappings in `.df/config.yaml` should require reading the config in the label mapper — no changes to the fetcher or spec generator.
