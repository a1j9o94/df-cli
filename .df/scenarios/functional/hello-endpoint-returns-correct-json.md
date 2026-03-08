---
name: hello-endpoint-returns-correct-json
type: functional
spec_id: run_01KK5Q781KAW2BENBFBHQC3DCE
created_by: agt_01KK5Q781MJB543D1VC1C7SNR6
---

Test: GET /hello returns correct JSON response.

SETUP:
1. Start the server using startServer({ port: 0, db: inMemoryTestDb }) (port 0 for auto-assignment)
2. The server should be running and accessible

STEPS:
1. Send a GET request to http://localhost:{port}/hello
2. Read the response status code
3. Read the response Content-Type header
4. Parse the response body as JSON

EXPECTED:
- Response status code is 200
- Content-Type header includes 'application/json'
- Response body parses to exactly: { "message": "Hello, world!" }
- The 'message' key exists and its value is the string 'Hello, world!' (exact match, case-sensitive, with comma and exclamation mark)

PASS CRITERIA:
- All four expected conditions are met
- No server errors or exceptions thrown

FAIL CRITERIA:
- Status code is not 200
- Content-Type is not application/json
- Body is missing 'message' key
- Body 'message' value differs from 'Hello, world!' in any way