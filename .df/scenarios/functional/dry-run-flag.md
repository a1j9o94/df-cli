---
name: dry-run-flag
type: functional
spec_id: run_01KJSS4TD4WH5VKGWK6YWSWJZQ
created_by: agt_01KJSS4TD5H3A6M3NHC0H95JFZ
---

Setup: A valid GitHub issue exists at https://github.com/org/repo/issues/100.\n\nSteps:\n1. Count existing files in .df/specs/ directory\n2. Run: dark spec create --from-github https://github.com/org/repo/issues/100 --dry-run\n3. Verify exit code is 0\n4. Verify stdout contains the spec content that WOULD be generated (title, frontmatter, goal, requirements)\n5. Count files in .df/specs/ directory again\n6. Verify no new file was created (count unchanged)\n7. Verify no new record was inserted into the specs DB table\n\nPass criteria: --dry-run prints spec content to stdout without writing any file to disk or creating a DB record.