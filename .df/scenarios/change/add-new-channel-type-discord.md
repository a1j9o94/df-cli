---
name: add-new-channel-type-discord
type: change
spec_id: run_01KK7SEADG3VVG04QBWK3E2MTP
created_by: agt_01KK7SEADH9C0FDQK9V2HRH78R
---

Modification: Add a Discord notification channel. Expected effort: Implement a DiscordChannel class with a send(message) method in src/notifications/channels/discord.ts. Register it in the channel registry. Add 'dark notify setup --discord <webhook-url>' CLI option. Affected areas: (1) New file: src/notifications/channels/discord.ts, (2) Channel registry: add Discord to known types, (3) CLI: add --discord flag to setup command. NOT affected: Pipeline integration, event system, dispatcher, other channel implementations, config schema structure (just a new channel entry). Expected effort: ~30 minutes, 2-3 files changed. Pass criteria: Adding Discord requires zero changes to pipeline engine, event types, or dispatcher logic.