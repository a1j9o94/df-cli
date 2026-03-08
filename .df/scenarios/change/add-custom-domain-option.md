---
name: add-custom-domain-option
type: change
spec_id: run_01KK7SEJH6D58E9S9R87F3FWM1
created_by: agt_01KK7SEJH73MEGYRXSXR203WXG
---

Modification: Allow users to specify a custom .localhost subdomain via --domain flag (e.g., 'dark dash --domain myfactory.localhost'). Affected areas: src/commands/dash.ts (new CLI option), portless integration utility (parameterized domain), server.ts URL construction. Expected effort: Small — add one CLI option, pass domain string through to portless registration. Requires changing the hardcoded 'dark.localhost' to a configurable value. Tests need update to verify custom domain flows through correctly.