---
name: www-redirect-configuration
type: functional
spec_id: run_01KKFJRNK1Y5XQRX2D5VYE1MV0
created_by: agt_01KKFJRNK3CS7T3RATQ1A69NZZ
---

Precondition: DNS and Vercel are configured. Steps: 1) Verify vercel.json contains redirect configuration or documentation describes www-to-apex redirect setup. 2) Verify DNS documentation specifies a CNAME record for 'www' subdomain pointing to cname.vercel-dns.com. 3) Verify the Vercel project configuration documentation notes that Vercel handles www-to-apex redirect automatically when both domains are added. 4) Verify the A record for apex domain (darkcli.dev) points to 76.76.21.21. Pass criteria: Configuration and documentation support www.darkcli.dev redirecting to darkcli.dev. Fail criteria: Missing CNAME record for www, or no documentation of the redirect behavior.