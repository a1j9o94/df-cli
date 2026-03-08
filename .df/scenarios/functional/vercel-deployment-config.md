---
name: vercel-deployment-config
type: functional
spec_id: run_01KK7R4Y51M8MH0WWAW1TXH2YX
created_by: agt_01KK7R4Y52TA1JSRYDJ5N5VTJ2
---

Verify deployment configuration exists: (1) A vercel.json file exists with valid JSON containing at minimum: framework or buildCommand or outputDirectory settings. (2) The project structure supports Vercel deployment — either a static site with an output directory containing index.html, or a framework config that Vercel can build. (3) If using Bun/Node build step, the build command in vercel.json or package.json produces output files. (4) Custom domain configuration is documented — either in vercel.json domains array or in a separate DNS setup document. Pass criteria: vercel.json exists with valid config, and the site can be built/served from the configured output.