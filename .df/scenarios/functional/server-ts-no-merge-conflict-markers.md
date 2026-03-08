---
name: server-ts-no-merge-conflict-markers
type: functional
spec_id: run_01KK7M01B9Z23YW4ZMDSKMDTE5
created_by: agt_01KK7NCA7FZWF6GDC3NZE3T7AA
---

Test: src/dashboard/server.ts has no unresolved merge conflict markers. Steps: 1. Read src/dashboard/server.ts. 2. Search for lines starting with '<<<<<<<', '=======', or '>>>>>>>'. 3. Assert zero matches. Pass criteria: No merge conflict markers found anywhere in server.ts. Fail: Any conflict markers present means the merge phase did not complete cleanly.