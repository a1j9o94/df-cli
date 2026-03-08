---
name: change-greeting-message
type: change
spec_id: run_01KK5Q781KAW2BENBFBHQC3DCE
created_by: agt_01KK5Q781MJB543D1VC1C7SNR6
---

Changeability test: Modify greeting from 'Hello, world!' to 'Hi there!'

MODIFICATION:
Change the greeting message returned by the /hello endpoint from 'Hello, world!' to 'Hi there!'

EXPECTED EFFORT:
- Only ONE file should need to change (the file containing the /hello route handler or its greeting constant)
- The test file may also need updating to match the new expected value, but the production code change should be isolated to a single file

VERIFICATION:
1. Identify all files that need modification to change the greeting
2. Count of production code files changed should be exactly 1
3. After the change, GET /hello should return { "message": "Hi there!" } with status 200

AFFECTED AREAS:
- The route handler for /hello (in src/dashboard/server.ts or a new dedicated file)
- The corresponding test file (expected value update)

PASS CRITERIA:
- Exactly 1 production source file needs modification
- The change is a simple string replacement
- No structural or architectural changes needed

FAIL CRITERIA:
- More than 1 production source file needs modification
- The greeting string is duplicated across multiple files
- Changing the greeting requires modifying test infrastructure or server setup