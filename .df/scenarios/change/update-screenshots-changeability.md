---
name: update-screenshots-changeability
type: change
spec_id: run_01KK7R4Y51M8MH0WWAW1TXH2YX
created_by: agt_01KK7R4Y52TA1JSRYDJ5N5VTJ2
---

Modification: Replace all screenshot images in the screenshots/images directory with new files of the same filenames. Expected behavior: After replacing image files and redeploying (vercel deploy or git push), the landing page displays the new images without any code changes to HTML, CSS, or JS files. Verification: (1) Image references in HTML use relative paths to an images/screenshots directory (not inline base64 or hardcoded URLs). (2) No image filenames are hardcoded in JavaScript logic — only in HTML img src attributes or CSS background-image. (3) Replacing a file like screenshots/dashboard.png with a different image of the same name requires zero code changes. Affected areas: Image files only. Expected effort: < 5 minutes (file replacement + deploy). Pass criteria: Swapping image files updates the page with no code modifications needed.