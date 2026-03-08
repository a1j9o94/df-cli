---
name: cli-export-markdown
type: functional
spec_id: run_01KK7R4Y1NWJRH426C68FK58CZ
created_by: agt_01KK7R4Y1TEX0SQCM76106T1F2
---

Preconditions: A completed run exists with 3 modules, all scenarios passed, and highlights.json populated.

Steps:
1. Run: dark run output <run-id>
2. Verify stdout contains formatted output with:
   - Run title header
   - 'Modules Built (3)' section
   - Per-module: name, files created/modified, test count, decisions
   - Scenarios summary line (e.g., '8/8 passed')
3. Run: dark run output <run-id> --export
4. Verify output says file was written and prints path
5. Verify .df/runs/<run-id>/output.md exists
6. Read the markdown file and verify:
   - Contains module summaries with files and test counts
   - Contains scenario results
   - Is valid markdown (headers, lists, code blocks)

Pass criteria:
- CLI prints readable formatted output to stdout
- --export writes valid markdown file to correct path
- File path is printed after export
- Markdown contains all module summaries and scenario results
- Markdown is well-structured with proper headers and formatting

Fail criteria:
- CLI command not recognized or errors
- stdout output missing module details
- --export doesn't create file
- Markdown file is empty or malformed
- File written to wrong location