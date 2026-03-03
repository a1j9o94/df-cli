---
name: integration-must-merge-all-builder-branches
type: functional
spec_id: run_01KJSRR01K5PXP0JVNMG3RYM19
created_by: agt_01KJSW378W7038EF5CSNA1WSMC
---

Precondition: A run with N builder modules exists, all builders completed. Steps: 1) Run integration-tester. 2) Verify the integration branch contains files from ALL builder modules, not just a subset. 3) For each builder branch, check that its key files (new source files, schema changes, command registrations) exist on the integration branch. Expected: Integration branch is a proper merge of ALL builder branches. Pass criteria: Every new file introduced by any builder branch must be present on the integration branch. Failure to merge even one builder branch is a fail.