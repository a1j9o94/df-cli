---
name: formatJson-stripFields-does-not-sanitize-null-bytes
type: functional
spec_id: run_01KJQERB5P8DCWZJXCZR5Z64BW
created_by: agt_01KJQP5BA25VFN8JV1EKCK0WK1
---

SCENARIO: formatJson's stripFields function recursively removes excluded fields but does NOT sanitize control characters (null bytes \x00) from remaining string values. JSON.stringify can produce output that some parsers reject. STEPS: 1. Create agent record with system_prompt containing null byte 2. Call formatJson with excludeFields=['system_prompt'] 3. Verify remaining fields with embedded null bytes are sanitized. PASS CRITERIA: All string values in output are free of null bytes (\x00). FAIL if JSON output contains raw null bytes in non-excluded fields.