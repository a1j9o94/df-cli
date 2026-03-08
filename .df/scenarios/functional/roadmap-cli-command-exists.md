---
name: roadmap-cli-command-exists
type: functional
spec_id: run_01KK7SEAH0J838RH3SWCBR48SQ
created_by: agt_01KK7WKAGDDJX8A7M6DDXSNTT6
---

Steps: 1. Run dark roadmap --help. 2. Run dark roadmap with 5 specs having dependencies. 3. Run dark roadmap --json. Pass: dark roadmap command exists, outputs spec dependency layers as text and JSON. Fail: Command not found. Note: The roadmap-view scenario expects a CLI command but only the dashboard /roadmap route exists.