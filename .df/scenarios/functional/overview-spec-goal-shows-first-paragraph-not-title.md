---
name: overview-spec-goal-shows-first-paragraph-not-title
type: functional
spec_id: run_01KJT1DSECDSZP9V2JPPS48CRC
created_by: agt_01KJT41Z883KW29HZKC65GKRCB
---

SCENARIO: Overview tab spec goal shows the first paragraph from the spec content, not just the title. PRECONDITIONS: Database has a run linked to a spec with markdown content containing multiple paragraphs. The spec endpoint returns both title and content fields. TEST STEPS: 1. Fetch GET /api/runs/:id/spec and confirm it returns both title and content. 2. Verify the overview loadOverview() function uses specData.content (first paragraph) to render the spec goal, not specData.title. 3. The spec says: 'Spec goal (first paragraph from the spec file)' which means the actual content paragraph, not the frontmatter title. EXPECTED: The spec goal section shows the first content paragraph from the spec markdown, not just the title string. PASS CRITERIA: The loadOverview function extracts and displays the first paragraph from specData.content in the spec goal section.