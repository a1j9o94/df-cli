---
name: workspace-init-creates-specs-scenarios-dirs
type: functional
spec_id: run_01KK7SEAH0J838RH3SWCBR48SQ
created_by: agt_01KK7WKAGDDJX8A7M6DDXSNTT6
---

Steps: 1. Run dark workspace init in a directory with frontend/ and backend/ subdirs. 2. Verify .df-workspace/specs/ directory exists. 3. Verify .df-workspace/scenarios/ directory exists. 4. Verify .df-workspace/scenarios/functional/ directory exists. 5. Verify .df-workspace/scenarios/change/ directory exists. Pass: All directories are created by workspace init. Fail: Any directory is missing. Note: The spec explicitly requires these dirs exist after init.