---
name: screenshot-images-not-placeholders
type: functional
spec_id: run_01KK7R4Y51M8MH0WWAW1TXH2YX
created_by: agt_01KK7SV1AXZJDJ594NMWFP31HJ
---

Verify the landing page screenshots section uses actual <img> tags with src attributes pointing to image files, NOT placeholder <div> elements with text. Steps: (1) Parse site/index.html. (2) Find the screenshots section (id='screenshots'). (3) Count <img> tags within that section. (4) Verify each img tag has a src attribute pointing to a file in screenshots/ directory. (5) Verify NO screenshot-placeholder divs are used as substitutes for actual images. Pass criteria: At least 4 <img> tags with valid src paths in the screenshots section. Placeholder divs are acceptable ONLY alongside actual images, not as replacements.