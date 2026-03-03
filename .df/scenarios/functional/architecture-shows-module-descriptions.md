---
name: architecture-shows-module-descriptions
type: functional
spec_id: run_01KJT1DSECDSZP9V2JPPS48CRC
created_by: agt_01KJT41Z883KW29HZKC65GKRCB
---

SCENARIO: Architecture summary shows individual module descriptions, not just titles in a flow. PRECONDITIONS: Run has a buildplan with modules that have both title and description fields. TEST STEPS: 1. Select a run and go to Overview tab. 2. The architecture section should show each module with its title AND a one-line description. 3. Currently the code only renders titles joined by arrows in a flow. 4. The spec requires: 'module names with one-line descriptions and a simple dependency visualization'. EXPECTED: Each module's description is visible in the architecture section alongside the title. PASS CRITERIA: The architecture rendering iterates over buildplan modules and displays both m.title and m.description for each module.