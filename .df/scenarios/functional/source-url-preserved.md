---
name: source-url-preserved
type: functional
spec_id: run_01KK713FAZE5AV73F5HB66BPVF
created_by: agt_01KK713FB00321PM7C8TQ1YDQZ
---

Test: Verify source_url appears in generated spec frontmatter.

Setup:
- Mock issue with any valid content
- URL: 'https://github.com/my-org/my-repo/issues/456'

Steps:
1. Call importAndCreateSpec with url='https://github.com/my-org/my-repo/issues/456'
2. Verify result.sourceUrl === 'https://github.com/my-org/my-repo/issues/456'
3. Read generated spec file
4. Parse YAML frontmatter
5. Verify frontmatter.source_url === 'https://github.com/my-org/my-repo/issues/456'

Pass criteria: source_url in frontmatter exactly matches the input GitHub issue URL.