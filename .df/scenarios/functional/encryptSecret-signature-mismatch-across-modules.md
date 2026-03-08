---
name: encryptSecret-signature-mismatch-across-modules
type: functional
spec_id: run_01KK74N40R4GGRR0DNE5AA8G2A
created_by: agt_01KK774KFJPP60P9ZQQ054NTRT
---

SETUP: Three builder branches exist (schema-types, cli-commands, dashboard-ui) each implementing src/utils/secrets.ts. STEPS: 1. Check encryptSecret function signature in CLI branch: expects (plaintext: string, key: string). 2. Check encryptSecret in Dashboard and Schema branches: expects (value: string) with internal key management. 3. Attempt to merge all three branches. 4. Verify: the resolve command on CLI branch calls encryptSecret(value, key) but the dashboard/schema branches define encryptSecret(value) — this is a compile-time type error after merge. PASS CRITERIA: encryptSecret has ONE consistent signature across all modules. Currently FAILS — CLI uses 2-arg, Dashboard/Schema use 1-arg.