---
name: registry-auto-populates
type: functional
spec_id: run_01KJT1F6D5K21YTBJJ2QG4QY7E
created_by: agt_01KJT1F6D7F50TK3PWRMAKQHN9
---

# Registry Auto-Populates on Init

## Preconditions
- ~/.dark/registry.yaml either does not exist or is empty
- A new directory /tmp/test-reg-project/ exists as a git repo

## Steps
1. cd /tmp/test-reg-project/
2. Run: dark init --name test-reg
3. Check ~/.dark/registry.yaml

## Expected Output
1. dark init completes successfully (existing behavior preserved)
2. ~/.dark/ directory is created if it doesn't exist
3. ~/.dark/registry.yaml now contains an entry:
   - name: test-reg
   - path: /tmp/test-reg-project (absolute path)
   - type: project
   - registeredAt: (ISO timestamp)
4. Running dark init again in a different directory adds a second entry
5. dark projects list shows all registered entries
6. dark projects prune removes entries for deleted directories

## Pass Criteria
- ~/.dark/registry.yaml is valid YAML
- Entry path is absolute, not relative
- Duplicate entries for the same path are not created (idempotent)
- dark init still creates .df/ as before (no regression)
- dark projects list outputs registered projects with their details
- dark projects prune removes stale entries and reports what was pruned