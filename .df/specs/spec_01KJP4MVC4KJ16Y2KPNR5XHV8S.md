---
id: spec_01KJP4MVC4KJ16Y2KPNR5XHV8S
title: "Launch darkcli.dev: landing page on Vercel with GoDaddy DNS"
type: feature
status: draft
version: 0.1.0
priority: medium
depends_on:
  - spec_01KJNXN7HMMAPWM1MSD2XNT4EC
---

# Launch darkcli.dev

## Goal

Ship a landing page for dark at darkcli.dev. The page explains what dark is, shows screenshots of the dashboard and pipeline in action, and links to the GitHub repo. Hosted on Vercel, DNS configured via GoDaddy using [godaddy-cli](https://github.com/cabemo/godaddy-cli).

## Requirements

### Module 1: Landing Page
- Single-page site (HTML/CSS/JS or Next.js — keep it simple)
- Dark theme matching the dashboard aesthetic
- Sections:
  - **Hero**: "Dark Factory — AI agents that build software" with a one-liner and CTA to GitHub
  - **How it works**: The 8-phase pipeline visualized (scout → architect → build → evaluate → merge)
  - **Screenshots**: Dashboard views from the README screenshots spec (pipeline view, module grid, roadmap, agent timeline)
  - **Key features**: Parallel builders, holdout scenarios, contract-driven decomposition, budget control
  - **CLI examples**: Terminal screenshots showing `dark build`, `dark status`, `dark dash`
  - **Get started**: `git clone` + `bun install` + `dark init` quick start
  - **Footer**: GitHub link, license
- Responsive (mobile + desktop)
- Fast — no heavy frameworks, minimal JS

### Module 2: Vercel Deployment
- Create a new Vercel project linked to df-cli repo (or a separate `darkcli-web` repo)
- Configure build and output settings
- Deploy to Vercel, verify it works at the `.vercel.app` domain first
- Add `darkcli.dev` as a custom domain in Vercel project settings

### Module 3: GoDaddy DNS Configuration
- Install and configure [godaddy-cli](https://github.com/cabemo/godaddy-cli)
- Set DNS records for darkcli.dev:
  - `A` record → Vercel's IP (76.76.21.21)
  - `CNAME` for `www` → `cname.vercel-dns.com`
- Verify DNS propagation
- Verify HTTPS works (Vercel auto-provisions SSL)
- Document the DNS setup so it can be replicated

## Scenarios

### Functional

1. **Page loads at darkcli.dev**: Navigate to https://darkcli.dev. Verify the page loads with hero, how-it-works, screenshots, and get-started sections.

2. **HTTPS works**: Verify https://darkcli.dev has a valid SSL certificate.

3. **www redirect**: Verify https://www.darkcli.dev redirects to https://darkcli.dev.

4. **Mobile responsive**: Open on mobile viewport. Verify layout adapts, screenshots are scrollable, text is readable.

5. **GitHub link works**: Click the GitHub CTA. Verify it goes to the df-cli repo.

### Changeability

1. **Update screenshots**: Replacing images in the screenshots directory and redeploying should update the page without any code changes.
