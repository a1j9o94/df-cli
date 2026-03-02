---
name: add-new-context-field
type: change
spec_id: run_01KJP6GK3B3RYANRP51CFYXDF7
created_by: agt_01KJP6GK3CC8RV8Q8WDC17DRVD
---

MODIFICATION: Add a 'code coverage report' field to the integration tester's instructions.

DESCRIPTION: A developer wants to include code coverage data (e.g., from bun test --coverage) in the integration tester's mail instructions. This requires:
1. Adding a 'coverageReport' field to the IntegrationTesterContext interface
2. Querying/generating coverage data in the context-gathering function
3. Adding a new section to the integration-tester mail template in sendInstructions()

AFFECTED AREAS:
- src/pipeline/instruction-context.ts (add field to interface, add query to gather function)
- src/pipeline/engine.ts (add rendering of the new field in the integration-tester case of sendInstructions)

EXPECTED EFFORT:
- Adding the interface field: 1-2 lines
- Adding the query: 5-10 lines
- Adding the template section: 3-5 lines
- Total: ~15 lines across 2 files, no structural changes required

PASS CRITERIA:
- The change requires modifications to at most 2 files
- No new files need to be created
- No existing interfaces or function signatures need breaking changes
- The pattern for adding a new field is clear: add to interface -> add to gather function -> add to template
- The change can be completed in under 10 minutes by a developer familiar with the codebase

FAIL CRITERIA:
- Adding a new field requires modifying more than 3 files
- The change requires restructuring the template system
- The change requires modifying the DB schema
- No clear pattern exists for extending the instruction context