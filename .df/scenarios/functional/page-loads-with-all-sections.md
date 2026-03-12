---
name: page-loads-with-all-sections
type: functional
spec_id: run_01KKFJRNK1Y5XQRX2D5VYE1MV0
created_by: agt_01KKFJRNK3CS7T3RATQ1A69NZZ
---

Precondition: The site/ directory contains a valid index.html and styles.css. Steps: 1) Open site/index.html in a browser (or serve it via site/server.ts on localhost:3000). 2) Verify the page loads without JavaScript errors in the console. 3) Verify the following sections exist by their HTML id attributes: #hero, #how-it-works, #screenshots, #features, #cli, #get-started. 4) Verify the hero section contains the text 'Dark Factory' and 'AI agents that build software'. 5) Verify the how-it-works section has 8 phase cards (scout, architect, plan-review, build, integrate, evaluate, iterate, merge). 6) Verify the screenshots section contains exactly 4 screenshot cards with image references to pipeline-view, module-grid, agent-timeline, and roadmap. 7) Verify the get-started section shows git clone, bun install, and dark init commands. 8) Verify a footer exists with a GitHub link to https://github.com/a1j9o94/df-cli. Pass criteria: All 8 checks pass. Fail criteria: Any section is missing, empty, or contains only placeholder text without meaningful content.