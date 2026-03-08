---
name: edit-draft-spec
type: functional
spec_id: run_01KK6BYC9GJ9F5XNE49PW7SN3S
created_by: agt_01KK6BYC9JZPT9DBGBS867HCTJ
---

Precondition: A draft spec exists in the database with known id and file_path.

Steps:
1. GET /api/specs/:id — verify status is draft, body contains original content
2. Send PUT /api/specs/:id with body: {"content": "<modified markdown with changed requirements section>"}
3. Verify response status 200 with updated spec data
4. Read the file at .df/<file_path> and verify the content on disk matches the PUT body
5. GET /api/specs/:id again and verify the returned content reflects the changes
6. Verify frontmatter fields (id, status, type) are preserved after edit
7. Verify updated_at timestamp in database has changed

Pass criteria: File on disk updated. API returns updated content. Frontmatter preserved. Only the markdown body changed.