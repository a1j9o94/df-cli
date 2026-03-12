---
name: update-screenshots-changeability
type: change
spec_id: run_01KKFJRNK1Y5XQRX2D5VYE1MV0
created_by: agt_01KKFJRNK3CS7T3RATQ1A69NZZ
---

Modification description: Replace screenshot images by dropping new PNG files into site/screenshots/ directory. Affected areas: site/screenshots/ directory and the #screenshots section of site/index.html. Steps: 1) Place a new image file at site/screenshots/pipeline-view.png. 2) Serve or open site/index.html. 3) Verify the pipeline-view screenshot card displays the new image WITHOUT any edits to index.html, styles.css, or any other file. 4) Verify the HTML uses <img> tags (not CSS background-image or text placeholders) with src attributes pointing to ./screenshots/*.png or similar relative paths. 5) Verify that all 4 screenshot slots (pipeline-view.png, module-grid.png, agent-timeline.png, roadmap.png) reference files from the screenshots/ directory via <img> tags. 6) Verify graceful fallback when an image file does not exist (shows placeholder or styled empty state, not a broken image icon). Expected effort: Zero code changes — only file replacement in screenshots/ directory. Pass criteria: New images appear in the page without code changes; missing images show graceful fallback. Fail criteria: HTML uses text placeholders instead of <img> tags; no fallback for missing images; or code changes required to update screenshots.