---
id: spec_01KJNZMJ8JTXE814KJVNBE5D4A
title: "Agent blocker requests: agents can pause runs to request resources from the user"
type: feature
status: draft
version: 0.1.0
priority: medium
depends_on:
  - spec_01KJNYN8F0RKERQ42F8Y8DHAYD
  - spec_01KJNYN8QXD7XJXG9QVR20RK0W
---

# Agent Blocker Requests

## Goal

Agents sometimes hit blockers they can't resolve themselves — missing API keys, credentials for a third-party service, access to a private repo, a design decision that requires human judgment. Instead of failing, the agent should be able to raise a structured blocker request that pauses the run and notifies the user. The user provides the missing resource (via dashboard or CLI), and the run resumes automatically.

This is NOT human-in-the-loop for code decisions. Agents don't ask "should I use React or Vue?" — that's the architect's job. This is for hard blockers where the agent literally cannot proceed without something the user has to provide.

## Requirements

### Module 1: `dark agent request` command
- `dark agent request <agent-id> --type <type> --description "<what I need>"` — raise a blocker
- Types:
  - `secret` — needs an API key, token, or credential (e.g. "Stripe test API key for integration tests")
  - `access` — needs access to a resource (e.g. "read access to private repo org/backend")
  - `decision` — needs a human decision on something the spec didn't cover (e.g. "spec says 'add auth' but doesn't specify OAuth vs magic link — which one?")
  - `resource` — needs a file, document, or artifact (e.g. "need the OpenAPI spec for the backend API")
- The command:
  1. Creates a `blocker_requests` DB record with type, description, status (pending)
  2. Pauses the agent (marks as `blocked`)
  3. Sends notification to all configured channels
  4. If this is the only active agent, pauses the entire run

### Module 2: Blocker resolution
- `dark agent resolve <request-id> --value "<the answer>"` — provide the requested resource from CLI
- `dark agent resolve <request-id> --file <path>` — provide a file
- `dark agent resolve <request-id> --env <KEY=VALUE>` — set an environment variable for the agent
- Dashboard: blocker shows as a yellow card with a text input field. User types the answer, hits "Resolve", run resumes.
- On resolution:
  1. Value is sent to the agent via mail
  2. Agent is unpaused (marked as `running`)
  3. If run was paused, run resumes
  4. Notification sent: "Blocker resolved, run resuming"

### Module 3: Blocker visibility
- `dark blockers [--run-id <id>]` — list all pending blockers
- Dashboard shows blockers prominently — yellow banner at top of run view
- Blockers include: which agent, which module, what type, the description, when raised
- Resolved blockers stay in history (for audit trail)

### Module 4: Security for secrets
- Secret-type blockers store values encrypted or in a separate secrets store (not plain text in SQLite)
- Secret values are passed to agents via environment variables, not mail body
- Secret values are never logged or shown in dashboard after resolution
- `dark secrets list` shows which secrets exist (names only, not values)

## Scenarios

### Functional

1. **Agent requests API key**: Evaluator needs a Stripe test key. Calls `dark agent request <id> --type secret --description "Stripe test API key (sk_test_...) for payment integration tests"`. Verify: agent paused, notification sent, dashboard shows blocker.

2. **User resolves via CLI**: `dark agent resolve <req-id> --env STRIPE_KEY=sk_test_abc`. Verify: agent receives the env var, resumes, run continues.

3. **User resolves via dashboard**: Open dashboard, see yellow blocker card, type the API key, click Resolve. Verify same behavior as CLI resolution.

4. **Decision blocker**: Architect calls `dark agent request <id> --type decision --description "Spec says add auth but doesn't specify method. OAuth2, magic link, or username/password?"`. Verify: run pauses, user responds "OAuth2", architect receives answer and continues.

5. **Multiple blockers**: Two agents request different things simultaneously. Verify both show in `dark blockers`. Resolve one — that agent resumes. Other stays blocked.

6. **Secret not exposed**: Resolve a secret-type blocker. Verify the value doesn't appear in `dark mail check`, dashboard agent details, or event logs.

### Changeability

1. **Add blocker auto-resolution**: For common blockers (like "needs npm install"), the system could auto-resolve without human intervention. Should require only adding a resolver function — no changes to the blocker/resume flow.
