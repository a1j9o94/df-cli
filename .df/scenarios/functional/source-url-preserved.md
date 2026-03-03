---
name: source-url-preserved
type: functional
spec_id: run_01KJSS4TD4WH5VKGWK6YWSWJZQ
created_by: agt_01KJSS4TD5H3A6M3NHC0H95JFZ
---

Setup: Any valid GitHub issue.\n\nSteps:\n1. Run: dark spec create --from-github https://github.com/myorg/myrepo/issues/42\n2. Read the generated spec file\n3. Verify the YAML frontmatter contains: source_url: https://github.com/myorg/myrepo/issues/42\n4. Verify the SpecFrontmatter type now includes the source_url field\n5. Verify the source URL is also printed in the stdout summary\n\nPass criteria: source_url field is present in frontmatter and matches the original GitHub issue URL exactly.