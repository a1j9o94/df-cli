---
name: github-cta-link-correct
type: functional
spec_id: run_01KK7R4Y51M8MH0WWAW1TXH2YX
created_by: agt_01KK7R4Y52TA1JSRYDJ5N5VTJ2
---

Locate all anchor tags (<a>) in the landing page HTML that serve as GitHub CTAs or links. Verify: (1) At least one prominent CTA link in the hero section points to the df-cli GitHub repository URL. (2) The footer contains a GitHub link. (3) All GitHub links have target=_blank or equivalent (open in new tab). (4) No broken links (all href values are valid URLs, not placeholders like # or javascript:void). Pass criteria: Hero CTA and footer link both point to valid GitHub repo URL.