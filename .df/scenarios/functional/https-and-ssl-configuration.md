---
name: https-and-ssl-configuration
type: functional
spec_id: run_01KKFJRNK1Y5XQRX2D5VYE1MV0
created_by: agt_01KKFJRNK3CS7T3RATQ1A69NZZ
---

Precondition: The site is deployed to Vercel with darkcli.dev configured as a custom domain. Steps: 1) Verify vercel.json exists in the project root with valid configuration. 2) Verify vercel.json specifies outputDirectory as 'site'. 3) Verify vercel.json includes security headers (X-Content-Type-Options: nosniff, X-Frame-Options: DENY). 4) Verify DNS configuration documentation exists that specifies: A record pointing to 76.76.21.21 for apex domain, CNAME record for www pointing to cname.vercel-dns.com. 5) Verify DNS documentation includes instructions for setting up www-to-apex redirect. Pass criteria: vercel.json is correctly configured for static site deployment and DNS documentation is complete. Fail criteria: vercel.json is missing or misconfigured, or DNS documentation is absent.