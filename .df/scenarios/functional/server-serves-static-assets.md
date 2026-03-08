---
name: server-serves-static-assets
type: functional
spec_id: run_01KK7R4Y51M8MH0WWAW1TXH2YX
created_by: agt_01KK7SV1AXZJDJ594NMWFP31HJ
---

Verify the Bun server (site/server.ts) correctly serves static assets like CSS and images. Steps: (1) Read site/server.ts. (2) Verify it imports and serves index.html at root route '/'. (3) Verify it has a fallback handler for static files (CSS, images, JS). (4) Start the server and request /styles.css — should return CSS content with correct content-type. (5) Request a file from /screenshots/ directory — should return the file. Pass criteria: Server serves index.html at root AND handles static file requests for CSS and images.