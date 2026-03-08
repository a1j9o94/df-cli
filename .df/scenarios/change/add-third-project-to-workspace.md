---
name: add-third-project-to-workspace
type: change
spec_id: run_01KK7SEAH0J838RH3SWCBR48SQ
created_by: agt_01KK7SEAH1RRSGYDNFYKMRG751
---

## Change: Add a Third Project to Workspace

### Modification Description
Add a shared/ library project to an existing workspace that has frontend/ and backend/. The shared/ project contains TypeScript interfaces used by both.

### Steps Required
1. Create shared/ directory with git init and dark init
2. Edit .df-workspace/config.yaml to add:
   projects:
     - name: shared
       path: ./shared
       role: library
3. No changes to workspace engine code should be needed

### Expected Effort
- Config file edit only (< 1 minute)
- No code changes to dark CLI
- No database migrations
- No restart of running dashboard

### Affected Areas
- .df-workspace/config.yaml (manual edit)
- shared/.df/ (created by dark init)
- ~/.dark/registry.yaml (auto-updated by dark init)

### Pass/Fail
- PASS: Adding shared/ requires ONLY config.yaml edit + dark init in shared/. Subsequent dark build on workspace spec recognizes 3 projects. Dashboard shows 3 member projects.
- FAIL: Requires code changes to dark CLI, database migrations, or any modification beyond config.yaml and dark init.