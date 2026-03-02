---
id: spec_01KJNYN8F0RKERQ42F8Y8DHAYD
title: "Multi-channel notifications: Slack, email, and SMS alerts for build events"
type: feature
status: draft
version: 0.1.0
priority: medium
---

# Multi-channel notifications: Slack, email, and SMS alerts for build events

## Goal

Users shouldn't have to watch a terminal or refresh a dashboard to know when builds finish, fail, or burn through budget. dark should push notifications to Slack, email, or SMS when important events happen. Configurable per project, testable with one command, and silenceable when you need focus time.

## Problem

Today the only way to know a build finished is to watch the terminal or poll the dashboard. For long builds (especially swarms), this means checking back repeatedly. Budget overruns are only visible in logs. There's no way to fire-and-forget a build and trust you'll hear about the result.

## Requirements

### Module 1: Notification Configuration

- `dark notify setup --slack <webhook-url>` — configure a Slack incoming webhook
- `dark notify setup --email <address> --smtp-host <host> --smtp-port <port> --smtp-user <user> --smtp-pass <pass>` — configure email via SMTP
- `dark notify setup --email <address> --sendgrid-key <key>` — configure email via SendGrid API
- `dark notify setup --sms <phone> --twilio-sid <sid> --twilio-token <token> --twilio-from <from-number>` — configure SMS via Twilio
- Config stored in `.df/config.yaml` under a `notifications:` section:
  ```yaml
  notifications:
    channels:
      - type: slack
        webhook_url: https://hooks.slack.com/services/...
      - type: email
        address: pm@company.com
        provider: sendgrid
        api_key: SG.xxx
      - type: sms
        phone: "+15551234567"
        twilio_sid: AC...
        twilio_token: xxx
        twilio_from: "+15559876543"
    enabled: true
  ```
- `dark notify list` — show configured channels (mask secrets, show type and target)
- `dark notify remove --slack` / `--email` / `--sms` — remove a channel
- Sensitive values (API keys, tokens) should be stored as-is in the config file (it's local and gitignored via `.df/` being in `.gitignore`)

### Module 2: Notification Events

Events that trigger notifications:

| Event | When | Severity |
|-------|------|----------|
| `build-completed` | All scenarios passed, run status = completed | info |
| `build-failed` | Run failed (agent crash, scenario failures, pipeline error) | error |
| `budget-warning` | Run cost exceeds 80% of `--budget-usd` | warning |
| `budget-exceeded` | Run cost exceeds 100% of budget, auto-paused or stopped | error |
| `swarm-completed` | All specs in a `dark swarm` run are done | info |
| `swarm-failed` | A spec in the swarm failed and blocked downstream | error |

### Module 3: Notification Content

Each notification includes:
- **Spec title** (not spec ID)
- **Run status**: completed / failed / paused
- **Cost**: total spend for the run (e.g. "$4.23")
- **Duration**: wall clock time (e.g. "12m 34s")
- **Module summary**: "5/5 modules built" or "3/5 modules built, 2 failed"
- **Scenario pass rate**: "8/8 scenarios passed" or "6/8 passed, 2 failed"
- **Error summary** (for failures): first 200 chars of the error message
- **Action hint**: "View: dark dash" or dashboard URL if running

Slack-specific formatting:
- Use Slack Block Kit for structured layout
- Color-coded attachment: green for success, red for failure, yellow for warning

Email-specific formatting:
- Subject: `[dark] Build completed: <spec-title>` (or failed/warning)
- HTML body with the same content as Slack, formatted for email

SMS-specific formatting:
- Short message (160 chars max): `[dark] <spec-title>: <status>. Cost: $X.XX. <pass-rate>.`

### Module 4: Test and Mute

- `dark notify test` — send a test notification to ALL configured channels with sample data
- `dark notify mute` — temporarily silence all notifications (sets `enabled: false` in config)
- `dark notify unmute` — re-enable notifications (sets `enabled: true`)
- `dark notify status` — show whether notifications are enabled and which channels are configured

### Module 5: Pipeline Integration

- The pipeline engine (`src/pipeline/engine.ts`) calls notification hooks at the right moments
- Notification dispatch is async and non-blocking — a failed notification must never crash or delay a build
- Retry logic: 1 retry after 5 seconds for transient failures, then log and move on
- The notification module exports a `notify(event: NotificationEvent)` function that the pipeline calls
- Events carry structured data (spec title, run ID, cost, etc.) — the notification module formats per channel

## Scenarios

### Functional

1. **Slack notification on build complete**: Configure a Slack webhook. Complete a build successfully. Verify a Slack message is received with spec title, cost, and "all scenarios passed."

2. **Email on build failure**: Configure email via SMTP. Run a build that fails. Verify an email is received with subject containing "failed", body showing error summary and scenario results.

3. **Budget warning notification**: Set `--budget-usd 10`, configure Slack. Run a build that costs ~$9. Verify a warning notification is sent at the 80% mark (~$8) but the build continues.

4. **Test notification**: Configure Slack and email. Run `dark notify test`. Verify both channels receive a test message with sample data.

5. **Mute and unmute**: Configure Slack. Run `dark notify mute`. Complete a build. Verify no Slack message. Run `dark notify unmute`. Complete another build. Verify Slack message received.

6. **Notification does not block build**: Configure a Slack webhook that returns a 500 error. Complete a build. Verify the build completes successfully despite the notification failure, and a warning is logged.

7. **Swarm completion**: Configure Slack. Run `dark swarm` with 3 specs. Verify a notification is sent when the entire swarm completes (not per-spec).

### Changeability

1. **Add a new channel type**: Adding a Discord notification channel should require implementing a `DiscordChannel` class with a `send(message)` method and adding it to the channel registry — no changes to the pipeline integration or event system.

2. **Add a new event type**: Adding a "module-completed" event should require defining the event in the events enum and adding a `notify()` call in the pipeline — no changes to channel implementations.
