---
name: registry-auto-populates
type: functional
spec_id: run_01KK7SEAH0J838RH3SWCBR48SQ
created_by: agt_01KK7SEAH1RRSGYDNFYKMRG751
---

## Test: Registry Auto-populates on Init

### Preconditions
- ~/.dark/registry.yaml either does not exist or exists with some entries
- A new directory ~/test-new-project/ exists

### Steps
1. cd ~/test-new-project/
2. git init
3. Run dark init
4. Read ~/.dark/registry.yaml

### Expected Output
- ~/.dark/ directory exists
- registry.yaml contains an entry for test-new-project with:
  - name: test-new-project
  - path: absolute path to ~/test-new-project/
  - type: project (not workspace)
- Previous registry entries are preserved (not overwritten)

### Pass/Fail
- PASS: New project appears in registry, old entries preserved
- FAIL: Registry missing, entry not added, or old entries lost