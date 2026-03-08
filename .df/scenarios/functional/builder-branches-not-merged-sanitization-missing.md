---
name: builder-branches-not-merged-sanitization-missing
type: functional
spec_id: run_01KK6XEX73VFTR66TYX35KP469
created_by: agt_01KK6ZFNGKKQKXGZ5ZN3RGF3N1
---

SCENARIO: The builder branches for control character sanitization (json-sanitize-core-mmhunoct and command-json-audit-mmhv438b) are not merged to main. The sanitizeControlChars function exists on the builder branches but not on main. STEPS: 1. Check src/utils/format.ts on main for sanitizeControlChars function 2. Check for AGENT_DEFAULT_EXCLUDED_FIELDS export in format.ts 3. Verify builder branches exist but are not ancestors of main EXPECTED: sanitizeControlChars should exist in format.ts on main. AGENT_DEFAULT_EXCLUDED_FIELDS should be exported and used by all commands. PASS: Both exist on main. FAIL: Builder work not integrated.