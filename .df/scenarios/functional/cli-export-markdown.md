---
name: cli-export-markdown
type: functional
spec_id: run_01KJSYMVTRZA22SC742GEMEWDJ
created_by: agt_01KJSYMVTT7H090YHJERTJN6FG
---

## CLI Export Markdown

### Preconditions
- A completed run exists with run ID known
- The run has at least 2 modules, each with test results
- highlights.json exists with entries
- At least one screenshot exists (if visual run)

### Test Steps
1. Run: dark run output <run-id>
2. Verify stdout output contains:
   - Header line: '# Run Output: <spec title>'
   - '## Modules Built (<count>)' section
   - For each module: module name, files list, test count, decisions
3. Run: dark run output <run-id> --export
4. Verify file created at .df/runs/<run-id>/output.md
5. Read the file and verify it contains the same content as stdout
6. Verify the path is printed to stdout

### Expected Output
- Readable markdown output with module summaries
- Scenario results summary line: 'Scenarios: X/Y passed'
- Export writes to .df/runs/<run-id>/output.md

### Pass Criteria
- dark run output <run-id> prints formatted markdown to stdout
- --export flag creates output.md file at the correct path
- Module section lists files, test counts, and decisions
- Scenarios summary shows pass/total count