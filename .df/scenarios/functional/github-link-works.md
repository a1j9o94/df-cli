---
name: github-link-works
type: functional
spec_id: run_01KKFJRNK1Y5XQRX2D5VYE1MV0
created_by: agt_01KKFJRNK3CS7T3RATQ1A69NZZ
---

Precondition: site/index.html is served and accessible. Steps: 1) Locate all anchor tags with href containing 'github.com'. 2) Verify the hero CTA button links to https://github.com/a1j9o94/df-cli. 3) Verify the navigation contains a GitHub link to https://github.com/a1j9o94/df-cli. 4) Verify the footer contains a GitHub link to https://github.com/a1j9o94/df-cli. 5) Verify all GitHub links have valid href attributes (not '#' or empty). 6) Verify clicking the hero CTA 'View on GitHub' navigates to the correct repo URL. Pass criteria: All GitHub links point to https://github.com/a1j9o94/df-cli and are clickable. Fail criteria: Any GitHub link is broken, points to wrong repo, or is not clickable.