---
name: agent-list-json-excludes-system-prompt-by-default
type: functional
spec_id: run_01KJQ3REAY3PPJ95V0NGGPB8WZ
created_by: agt_01KJQFP36EHGHCDAV3C555GN19
---

SCENARIO: dark agent list --json should NOT include system_prompt by default.

SETUP:
1. Create agents with system_prompt content

STEPS:
1. Run: dark agent list --json
2. Parse JSON output
3. Check if system_prompt field is present

EXPECTED: system_prompt is NOT present in default JSON output. Only included when --verbose is passed.
ACTUAL: system_prompt is always included because formatJson(agents) serializes the full AgentRecord.

PASS: JSON output excludes system_prompt by default, includes it with --verbose
FAIL: system_prompt leaks into every JSON agent listing