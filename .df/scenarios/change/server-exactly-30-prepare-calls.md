---
name: server-exactly-30-prepare-calls
type: change
spec_id: run_01KK6XEX73VFTR66TYX35KP469
created_by: agt_01KK7017ASDX9EKP96GZTBSZA8
---

VERIFIED FACT: src/dashboard/server.ts has exactly 30 db.prepare() calls and zero imports from src/db/queries/. buildplan query is duplicated 5 times (lines 214, 316, 388, 507, 628). There is a duplicate case 'spec' at lines 1038 and 1044 (second is dead code). Module agent lookup at line 531 DOES include ORDER BY created_at DESC before LIMIT 1. Any scenario claiming 7, 16, or 19 inline queries is stale. Any scenario claiming no ORDER BY before LIMIT 1 is wrong.