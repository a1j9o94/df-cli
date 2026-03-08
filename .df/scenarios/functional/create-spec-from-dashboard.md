---
name: create-spec-from-dashboard
type: functional
spec_id: run_01KK6BYC9GJ9F5XNE49PW7SN3S
created_by: agt_01KK6BYC9JZPT9DBGBS867HCTJ
---

Precondition: Dashboard server running, .df/specs/ directory exists, state.db initialized.

Steps:
1. Send POST /api/specs with body: {"description": "Add a caching layer for the API responses"}
2. Verify response has status 201 and JSON body with fields: id (string, starts with spec_), title (string, non-empty), file_path (string, matches specs/*.md), status ("draft")
3. Verify a file exists at .df/<file_path> returned in step 2
4. Read the file and verify:
   a. YAML frontmatter contains: id matching returned id, status: draft, type: feature
   b. Body contains a # Title heading (non-empty)
   c. Body contains a ## Goal section with content derived from the description
   d. Body contains a ## Requirements section with at least one bullet point
   e. Body contains a ## Scenarios section (can be placeholder)
5. Query GET /api/specs and verify the new spec appears in the list with status: draft
6. Query GET /api/specs/:id and verify full content is returned (markdown body + parsed frontmatter)

Pass criteria: All verifications pass. Spec file on disk matches database record. Title is inferred from description (not empty/generic).