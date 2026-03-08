---
name: spec-list-grouped-by-status
type: functional
spec_id: run_01KK6BYC9GJ9F5XNE49PW7SN3S
created_by: agt_01KK6BYC9JZPT9DBGBS867HCTJ
---

Precondition: Database has at least 3 specs: one with status 'draft', one with status 'building', one with status 'completed'. The completed spec has a run with pass rate data.

Steps:
1. GET /api/specs — verify response contains all 3 specs
2. Each spec in response has: id, title, status, file_path, updated_at (or last modified)
3. Verify specs are grouped or taggable by status (draft, building, completed)
4. Load dashboard HTML (GET /)
5. In the rendered sidebar:
   a. Verify 'New Spec' button exists in sidebar header
   b. Verify all 3 specs appear as cards
   c. Verify each card shows: title, status badge, last modified date
   d. Verify completed spec shows pass rate indicator
   e. Verify specs are visually grouped by status category
6. Click a spec card — verify main panel shows spec content (not run content)

Pass criteria: All specs listed. Status badges correct. Completed spec shows pass rate. Sidebar is spec-centric not run-centric.