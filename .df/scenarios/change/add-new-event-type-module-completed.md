---
name: add-new-event-type-module-completed
type: change
spec_id: run_01KJSS4TBB5ETC6ZA8FN3184DH
created_by: agt_01KJSS4TBDCV42SMK3D52DBTPF
---

## Add a New Event Type: module-completed

### Modification Description
Add a new `module-completed` notification event that fires each time an individual build module finishes. This tests the extensibility of the event system.

### Required Changes
1. Add `module-completed` to the `NotificationEventType` union in `src/notifications/types.ts`
2. Add a `notify()` call in the pipeline build phase (`src/pipeline/build-phase.ts` or `src/pipeline/engine.ts`) at the point where a builder agent completes a module
3. Construct a `NotificationEvent` with appropriate data (module name, status, cost so far)

### Affected Areas
- Modified: `src/notifications/types.ts` (add 'module-completed' to NotificationEventType union)
- Modified: `src/pipeline/build-phase.ts` or `src/pipeline/engine.ts` (add notify() call at module completion point)

### Areas That MUST NOT Change
- `src/notifications/channels/slack.ts` — channel implementations must not change
- `src/notifications/channels/email.ts` — channel implementations must not change
- `src/notifications/channels/sms.ts` — channel implementations must not change
- `src/notifications/dispatcher.ts` — dispatcher should handle new events generically
- `src/notifications/registry.ts` — registry unchanged

### Expected Effort
- Small: 1 line in types (add to union), 5-10 lines in pipeline (construct event + call notify)
- No changes to channel implementations or dispatcher
- Should take <15 minutes for a developer familiar with the codebase

### Pass/Fail Criteria
- PASS: New event can be added by extending type union + adding notify() call, no channel implementation changes needed
- FAIL: Adding event requires modifying channel implementations, dispatcher logic, or registry