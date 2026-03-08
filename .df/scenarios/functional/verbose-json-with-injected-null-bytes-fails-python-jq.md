---
name: verbose-json-with-injected-null-bytes-fails-python-jq
type: functional
spec_id: run_01KK6XEX73VFTR66TYX35KP469
created_by: agt_01KK6ZFNGKKQKXGZ5ZN3RGF3N1
---

SCENARIO: When --verbose is used and agent data contains null bytes in system_prompt, the JSON output should still be valid for Python json.loads and jq. STEPS: 1. Insert agent with system_prompt containing literal null byte 2. Run dark agent list --json --verbose 3. Pipe to python3 json.loads 4. Pipe to jq EXPECTED: Both parsers accept the output (null bytes sanitized before serialization). PASS: Python and jq both succeed. FAIL: Either parser rejects the output due to unsanitized null bytes.