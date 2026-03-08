---
name: readme-has-screenshots-section
type: functional
spec_id: run_01KK7SEJF8M1ZV16NTKHPBWC4S
created_by: agt_01KK7SEJF9WN4SDJ2ZS9MSSD5X
---

Verify README.md contains a screenshots section between 'How It Works' and 'Agent Roles' headings. Steps: 1) Read README.md. 2) Confirm there is a section titled 'Screenshots' or 'What it looks like' (## level heading). 3) Confirm this section appears AFTER the 'How It Works' section and BEFORE the 'Agent Roles' section in the document. 4) Confirm the section contains at least 6 image references using markdown image syntax \![alt text](docs/screenshots/...). 5) Confirm each image reference points to a file path starting with docs/screenshots/. 6) Confirm each referenced PNG file actually exists on disk at the specified path. 7) Confirm each image has descriptive alt text (not empty, not just 'screenshot'). Pass criteria: All 6+ images exist, alt text is descriptive, section is correctly positioned.