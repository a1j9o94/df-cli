---
name: cli-export-markdown
type: functional
spec_id: run_01KK7SEJD8Z1CHN7Z2B1ZDT9P9
created_by: agt_01KK7SEJD9V7MRX6KC86N28S5K
---

PRECONDITIONS: A completed run exists with run-id 'test-run-123'. The run built 3 modules, has 8 passing scenarios, and captured 2 screenshots.

STEPS:
1. Run: dark run output test-run-123
2. Verify stdout contains structured output including:
   - Run title header
   - 'Modules Built (3)' section
   - Per-module entries with: Files list, Tests passing count, Decisions (if any), Screenshots count (if visual)
   - 'Scenarios: 8/8 passed' summary
3. Run: dark run output test-run-123 --export
4. Verify a markdown file is written to .df/runs/test-run-123/output.md
5. Verify the command prints the file path to stdout.
6. Read output.md and verify it contains the same structured content as stdout.

EXPECTED:
- CLI prints readable summary to stdout.
- --export flag writes markdown file and prints path.
- Content matches spec format (module summaries, scenario results).

PASS CRITERIA:
- Exit code 0 for both commands.
- stdout output matches format shown in spec.
- output.md file exists and contains valid markdown.
- Module names, file lists, test counts are accurate.