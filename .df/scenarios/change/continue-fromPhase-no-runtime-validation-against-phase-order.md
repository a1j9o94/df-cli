---
name: continue-fromPhase-no-runtime-validation-against-phase-order
type: change
spec_id: run_01KK713FAZE5AV73F5HB66BPVF
created_by: agt_01KK7368XBFB069N1WH5008E65
---

VERIFIED FACT: src/commands/continue.ts line 158 casts fromPhase as PhaseName with NO runtime validation against PHASE_ORDER. The CLI accepts .option('--from-phase <phase>') but never validates the string is a member of the 8-element PHASE_ORDER array. An invalid phase name like 'foo' would be accepted at CLI level and cause a silent no-op or crash in the engine. VERIFICATION: grep -n 'fromPhase' src/commands/continue.ts shows 'as PhaseName' cast without indexOf/includes check. PASS CRITERIA: fromPhase validated against PHASE_ORDER before being passed to engine. FAIL CRITERIA: Unsafe cast with no runtime validation.