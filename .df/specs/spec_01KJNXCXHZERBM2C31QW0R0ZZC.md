---
id: spec_01KJNXCXHZERBM2C31QW0R0ZZC
title: "Fix JSON output: sanitize control characters in --json commands"
type: bug
status: draft
version: 0.1.0
priority: high
---

# Fix JSON Output

## Problem

`dark agent list --json` produces invalid JSON when agent records contain system prompts with unescaped control characters (newlines, tabs). Python's `json.loads()` and other parsers reject it. This breaks any tooling that consumes dark's JSON output — including the dashboard API and CI scripts.

Root cause: `formatJson()` in `src/utils/format.ts` uses `JSON.stringify()` which handles standard escaping, but the `system_prompt` field contains raw multiline strings that may include characters JSON doesn't allow (e.g. literal `\n` bytes from template strings, or tab characters).

Likely fix: either exclude `system_prompt` from JSON output (it's huge and rarely useful in list views), or ensure the serialization properly handles all control characters.

## Requirements

- `dark agent list --json` must produce valid JSON parseable by `JSON.parse()`, Python `json.loads()`, and `jq`
- Exclude `system_prompt` from `--json` output by default (it bloats output and contains the control chars)
- Add `--verbose` flag to include system_prompt if explicitly requested
- Audit all other `--json` commands for the same issue: `dark status --json`, `dark spec list --json`, `dark scenario list --json`, `dark run list --json`

## Scenarios

### Functional

1. **Agent list JSON is valid**: Create agents with multiline system prompts containing newlines, tabs, and special characters. Run `dark agent list --json`. Pipe to `python3 -c "import sys,json; json.load(sys.stdin)"`. Verify it succeeds.

2. **System prompt excluded by default**: `dark agent list --json` output does NOT contain `system_prompt` field. Verify output is compact.

3. **Verbose includes prompt**: `dark agent list --json --verbose` includes `system_prompt` field, still valid JSON.

4. **All JSON commands valid**: Run every `--json` command and pipe to a JSON validator. None should fail.
