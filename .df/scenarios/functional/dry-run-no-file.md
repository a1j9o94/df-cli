---
name: dry-run-no-file
type: functional
spec_id: run_01KK713FAZE5AV73F5HB66BPVF
created_by: agt_01KK713FB00321PM7C8TQ1YDQZ
---

Test: --dry-run flag prints spec content to stdout but does NOT create a file on disk.

Setup:
- Mock issue with title 'Test Issue', body with requirements and acceptance criteria
- Set dryRun=true in importAndCreateSpec options

Steps:
1. Call importAndCreateSpec with dryRun=true
2. Verify result.content is a non-empty string containing the spec markdown
3. Verify result.content contains frontmatter (--- delimiters)
4. Verify result.content contains '## Goal'
5. Verify result.content contains '## Requirements'
6. Check the expected file path on disk: join(dfDir, 'specs', specId + '.md')
7. Verify the file does NOT exist (existsSync returns false)

Pass criteria: Spec content is returned in result.content but no file is written to disk.