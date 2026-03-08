---
name: add-new-event-type-module-completed
type: change
spec_id: run_01KK7SEADG3VVG04QBWK3E2MTP
created_by: agt_01KK7SEADH9C0FDQK9V2HRH78R
---

Modification: Add a 'module-completed' notification event that fires when each individual module finishes building. Expected effort: (1) Add 'module-completed' to the NotificationEventType enum/union, (2) Add a notify() call in the pipeline where module completion is detected (likely in the build phase agent completion handler), (3) Define what data the event carries (module title, module status, time taken). NOT affected: Channel implementations (Slack, Email, SMS), formatters, config schema, CLI commands, dispatcher logic. Expected effort: ~20 minutes, 2 files changed (event types + pipeline hook). Pass criteria: Adding the event requires zero changes to any channel implementation class.