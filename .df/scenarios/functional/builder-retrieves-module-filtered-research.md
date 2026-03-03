---
name: builder-retrieves-module-filtered-research
type: functional
spec_id: run_01KJSS7KKA4VATPRQN2J08E2ZX
created_by: agt_01KJSS7KKB53MFBSPK7CK20AE0
---

## Scenario: Builder retrieves research filtered by module

### Preconditions
- Dark Factory project initialized (dark init)
- A run exists with a known run_id
- An architect agent exists
- Research items have been added, some tagged with --module 'payments' and some with --module 'auth' and some with no module tag

### Setup
1. Add research item 1: dark research add <architect-id> --label 'Stripe API docs' --content 'Use stripe@14.x' --module payments
2. Add research item 2: dark research add <architect-id> --label 'JWT best practices' --content 'Use RS256 not HS256' --module auth
3. Add research item 3: dark research add <architect-id> --label 'General architecture notes' --content 'Microservices pattern'

### Steps
1. Run: dark research list --run-id <run-id> --module payments
2. Verify the output includes 'Stripe API docs' (tagged to payments)
3. Verify the output does NOT include 'JWT best practices' (tagged to auth)
4. Verify the output does NOT include 'General architecture notes' (no module tag)
5. Run: dark research list --run-id <run-id>
6. Verify the output includes ALL three research items (no module filter = show all)

### Pass/Fail Criteria
- PASS: Module filter correctly restricts results to only items tagged with the specified module. Unfiltered list shows all items.
- FAIL: Module filter returns wrong items, or unfiltered list is incomplete.