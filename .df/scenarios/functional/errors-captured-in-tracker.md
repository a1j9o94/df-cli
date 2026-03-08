---
name: errors-captured-in-tracker
type: functional
spec_id: run_01KK7M01B9Z23YW4ZMDSKMDTE5
created_by: agt_01KK7M01BAJP5NYAARTNT3X6MJ
---

Test: Errors in route handlers are captured and stored in error tracker.
Setup: Start the server. Trigger an error by sending a request that causes a route handler to throw (e.g., GET /api/runs/nonexistent/agents with a DB that throws, or a specially crafted request that triggers an unhandled error in a handler).
Steps:
1. Send a request that causes a route handler to throw an unhandled error
2. Assert the response returns a 500 status (error is caught)
3. Send GET /api/errors
4. Parse JSON body
5. Assert array length >= 1
6. Assert the error entry contains: timestamp (string, ISO format), path (string), method (string), error (string with error message), stack (string with stack trace)
Pass criteria: The thrown error appears in the /api/errors response with all required fields.