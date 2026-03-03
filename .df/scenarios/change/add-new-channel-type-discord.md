---
name: add-new-channel-type-discord
type: change
spec_id: run_01KJSS4TBB5ETC6ZA8FN3184DH
created_by: agt_01KJSS4TBDCV42SMK3D52DBTPF
---

## Add a New Channel Type: Discord

### Modification Description
Add a Discord notification channel that sends messages via Discord webhooks. This tests the extensibility of the channel architecture.

### Required Changes
1. Create a new `DiscordChannel` class implementing `NotificationChannel` interface with a `send(event: NotificationEvent): Promise<void>` method
2. Register the Discord channel in the channel registry/factory
3. Add `discord` to the `ChannelType` union type
4. Add Discord config type (`DiscordChannelConfig` with `type: 'discord'` and `webhook_url: string`)

### Affected Areas
- New file: `src/notifications/channels/discord.ts` (channel implementation)
- Modified: `src/notifications/types.ts` (add DiscordChannelConfig to union, add 'discord' to ChannelType)
- Modified: `src/notifications/registry.ts` (register Discord factory)

### Areas That MUST NOT Change
- `src/pipeline/engine.ts` — pipeline integration must not need changes
- `src/notifications/dispatcher.ts` — dispatch logic must not need changes
- `src/notifications/channels/slack.ts` — existing channels unaffected
- `src/notifications/channels/email.ts` — existing channels unaffected
- `src/notifications/channels/sms.ts` — existing channels unaffected

### Expected Effort
- Small: 1 new file (~50-80 lines), 2-3 lines modified in types, 1-2 lines in registry
- No changes to core dispatch logic, pipeline, or event system
- Should take <30 minutes for a developer familiar with the codebase

### Pass/Fail Criteria
- PASS: Discord channel can be added by implementing interface + registering, no changes to pipeline or dispatcher
- FAIL: Adding Discord requires modifying dispatcher, pipeline engine, or other channel implementations