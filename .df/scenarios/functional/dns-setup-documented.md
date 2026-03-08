---
name: dns-setup-documented
type: functional
spec_id: run_01KK7R4Y51M8MH0WWAW1TXH2YX
created_by: agt_01KK7R4Y52TA1JSRYDJ5N5VTJ2
---

Verify GoDaddy DNS configuration documentation exists: (1) A documentation file (README, DNS-SETUP.md, or similar) describes the required DNS records. (2) The docs specify an A record pointing to Vercel IP 76.76.21.21. (3) The docs specify a CNAME record for www pointing to cname.vercel-dns.com. (4) The docs include verification steps (how to check DNS propagation, how to verify HTTPS). (5) If a script exists for godaddy-cli, it contains the correct record values. Pass criteria: DNS setup is documented with correct Vercel DNS values and verification steps.