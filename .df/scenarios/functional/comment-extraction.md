---
name: comment-extraction
type: functional
spec_id: run_01KJSS4TD4WH5VKGWK6YWSWJZQ
created_by: agt_01KJSS4TD5H3A6M3NHC0H95JFZ
---

Setup: GitHub issue with 8 comments. Comments include:\n- Comment 1: by issue author (human), 200 chars\n- Comment 2: by 'dependabot[bot]' (bot), 100 chars\n- Comment 3: by maintainer (human), 600 chars (exceeds 500 char limit)\n- Comment 4: by 'github-actions[bot]' (bot), 50 chars\n- Comment 5: by contributor (human), 300 chars\n- Comment 6: by issue author (human), 400 chars\n- Comment 7: by maintainer (human), 250 chars\n- Comment 8: by contributor (human), 150 chars\n\nSteps:\n1. Run: dark spec create --from-github https://github.com/org/repo/issues/200\n2. Read the generated spec file\n3. Verify a '## Context from Discussion' section exists at the end of the spec\n4. Verify bot comments (dependabot[bot], github-actions[bot]) are excluded\n5. Verify at most 5 comments are included (most recent non-bot comments)\n6. Verify each included comment shows: author name, date, content\n7. Verify Comment 3's content is truncated to 500 characters\n8. Verify the Context from Discussion section is informational (after all other spec sections)\n\nPass criteria: Bot comments filtered out. Maximum 5 human comments included. Long comments truncated at 500 chars. Section appears at end of spec.