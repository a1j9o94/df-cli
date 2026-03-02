---
name: agent-list-json-leaks-system-prompt
type: functional
spec_id: run_01KJP8WZ5DKH52F4S0SWCGKJWW
created_by: agt_01KJPD42HJG0YB8BSQEHB09TFK
---

SCENARIO: dark agent list --json includes the full system_prompt field for every agent, which can be thousands of characters. There is no mechanism to exclude it by default or include it only with --verbose. STEPS: 1. Read src/commands/agent/list.ts line 25: formatJson(agents) serializes the full agent record. 2. AgentRecord includes system_prompt TEXT which contains the full agent prompt. 3. The --json output includes system_prompt for all agents. 4. No --verbose flag exists to control inclusion/exclusion. EXPECTED: system_prompt should be excluded from --json output by default (it makes output huge and may leak holdout scenario info). Include only with --verbose flag. PASS CRITERIA: system_prompt excluded from default --json output. FAIL if system_prompt is always included.