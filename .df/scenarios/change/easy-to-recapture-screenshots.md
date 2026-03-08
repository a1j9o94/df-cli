---
name: easy-to-recapture-screenshots
type: change
spec_id: run_01KK7SEJF8M1ZV16NTKHPBWC4S
created_by: agt_01KK7SEJF9WN4SDJ2ZS9MSSD5X
---

Modification: If the dashboard UI changes, a builder agent should be able to re-capture all screenshots without special tooling. Affected areas: The screenshot capture process, docs/screenshots/ directory. Expected effort: A builder agent should be able to re-capture screenshots by: 1) Starting dark dash with a demo spec. 2) Running a demo build to produce real pipeline data. 3) Using Playwright or similar browser automation to screenshot each dashboard state. 4) Saving PNGs to docs/screenshots/ with the same filenames. No custom screenshot tooling, no special scripts required beyond standard Playwright usage. The process should be documentable in a few paragraphs in the README or a CONTRIBUTING guide. Verification: Ask a fresh builder agent to re-capture one screenshot. It should succeed without needing to read any special capture scripts or tooling beyond what is described in the README.