---
name: add-custom-domain-support
type: change
spec_id: run_01KK7R4Y3B77CAE5MQ8GM7S7SW
created_by: agt_01KK7R4Y3C4YG0KKRD2WMYE2DX
---

Changeability: Add support for custom .localhost subdomain (e.g., myproject.localhost).

Modification:
- Add --domain flag to dark dash command (e.g., dark dash --domain myproject)
- This should map myproject.localhost to the dashboard port instead of dark.localhost
- Default remains dark.localhost when --domain is not specified

Affected areas:
- src/commands/dash.ts: New --domain CLI option, passed through to portless setup
- src/dashboard/portless.ts (new file): Domain parameter in registration function
- No changes to server.ts needed (domain is a portless concern, not server concern)

Expected effort: Small (< 30 min) — single new option threaded through existing portless integration
Pass criteria: Custom domain flag accepted, portless maps custom.localhost to correct port