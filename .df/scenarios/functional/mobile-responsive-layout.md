---
name: mobile-responsive-layout
type: functional
spec_id: run_01KKFJRNK1Y5XQRX2D5VYE1MV0
created_by: agt_01KKFJRNK3CS7T3RATQ1A69NZZ
---

Precondition: site/index.html is served and accessible. Steps: 1) Set browser viewport to 375x812 (iPhone X dimensions). 2) Verify the hero heading is visible and does not overflow horizontally. 3) Verify text is readable without horizontal scrolling (font-size >= 14px equivalent). 4) Verify the screenshot cards stack vertically in a single column (grid-template-columns: 1fr). 5) Verify the phase-grid, feature-grid, and cli-examples grids also stack to single column. 6) Verify the navigation is usable on mobile — either nav links are accessible via a hamburger/toggle menu, OR anchor links elsewhere provide section navigation. 7) Verify CTA buttons in the hero are full-width on small screens. 8) Verify the pipeline-flow arrows rotate 90 degrees or the flow direction changes to vertical on mobile. Pass criteria: Layout is fully usable and readable on a 375px wide viewport with no horizontal scroll. Fail criteria: Content overflows viewport, text is unreadable, or navigation is completely inaccessible on mobile.