---
name: global-dashboard-starts-without-dfdir
type: functional
spec_id: run_01KK7SEAH0J838RH3SWCBR48SQ
created_by: agt_01KK7WKAGDDJX8A7M6DDXSNTT6
---

Steps: 1. Navigate to a directory with no .df/ or .df-workspace/. 2. Run dark dash. 3. Verify the dashboard starts successfully and shows all projects from ~/.dark/registry.yaml. Pass: Server starts, global dashboard HTML is rendered, no error thrown. Fail: Server throws 'Not in a Dark Factory project' error or exits. Note: The server.ts startServer() throws when no .df/ is found, preventing the global dashboard from working.