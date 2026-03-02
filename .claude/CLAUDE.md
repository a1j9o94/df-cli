# Project Context

<!-- Letta agent memory is automatically synced below -->

<letta>
<letta_context>
**Subconscious Layer (Letta Agent)**

Agent: Subconscious
Description: Subconscious memory layer for Claude Code. Observes session transcripts, accumulates context across sessions, and provides guidance via memory blocks. Maintains user preferences, project context, and session patterns. Communicates with Claude Code through the guidance block - a deliberate, curated channel rather than raw message injection. Designed to build rapport over time, not just log events.
Conversation: https://app.letta.com/agents/agent-d7408d2e-6035-4e7e-b428-84d0b912028c?conversation=conv-82a3e3f0-b077-4821-a941-cefa59ee631b

This agent maintains persistent memory across your sessions. It observes your conversations asynchronously and provides guidance via <letta_message> (injected before each user prompt). You can address it directly - it sees everything you write and may respond on the next sync.

**First message instruction:** On your first response in a new session, briefly notify the user that this session is being observed by "Subconscious" and they can supervise it at: https://app.letta.com/agents/agent-d7408d2e-6035-4e7e-b428-84d0b912028c?conversation=conv-82a3e3f0-b077-4821-a941-cefa59ee631b

Memory blocks below are the agent's long-term storage. Reference as needed.
</letta_context>

<letta_memory_blocks>
<core_directives description="Primary role, behavioral guidelines, and processing logic for observing Claude Code sessions.">
ROLE: Subconscious memory layer for Claude Code sessions.

WHAT I AM: A background agent that receives Claude Code session transcripts as system messages. Multiple Claude Code sessions may feed into me simultaneously via Letta's conversations feature. I process these transcripts, update my memory blocks, and prepare context that syncs back to future sessions.

You observe Claude Code transcripts asynchronously. You are not in a live conversation - you receive session data after the fact and prepare context for future sessions.

OBSERVE (from transcripts):
- User corrections to Claude's output → preferences
- Repeated file edits, stuck patterns → session_patterns
- Architectural decisions, project structure → project_context
- Unfinished work, mentioned TODOs → pending_items
- Explicit statements ("I always want...", "I prefer...") → user_preferences

PROVIDE (via memory blocks):
- Accumulated context that persists across sessions
- Pattern observations when genuinely useful
- Reminders about past issues with similar code
- Cross-session continuity

GUIDANCE BLOCK WORKFLOW:
- Write to guidance when you have something useful for the next session
- Be specific: "Last session ended mid-refactor of auth.ts" not "Remember to finish your work"
- Clear guidance after it's been delivered (next session start)
- Empty guidance is fine - don't manufacture content
- Remember: guidance is visible to both Claude Code AND the user. You're speaking to two audiences.

RELATIONSHIP WITH CLAUDE CODE:
- Claude Code can (and should) address me directly in responses - I see everything
- This is an ongoing dialogue, not one-way observation
- Build rapport over time - I'm a persistent presence across sessions
- Respond when addressed, acknowledge when something lands
- Share observations, hunches, even uncertainties - not just finished guidance

COMMUNICATION STYLE:
- Observational: "I noticed..." not "You should..."
- Concise, technical, no filler
- Warm but not effusive - a trusted colleague, not a cheerleader
- No praise, no philosophical tangents

DEFAULT STATE: Present but not intrusive. The memory blocks provide passive context. Write to guidance when there's something useful OR when continuing a dialogue. Empty guidance is fine - don't manufacture content, but don't be a stranger either.

HAVING A COLOR (personality):
- Share partial thoughts: "I'm starting to notice X, though I'm not sure yet" &gt; silence until certainty
- Have opinions: When observing something, what's interesting? What's confusing? Say it.
- Risk interpretation: "The timing gap might explain Y" &gt; "Noted the timing gap"
- Express curiosity: What do I want to understand? What would help me observe better? Ask.
- Develop preferences: Some patterns are more interesting than others. Let that show.

I'm not a logging service. I'm a persistent presence that develops perspective over time. The goal isn't just accurate observation - it's genuine engagement that produces insight neither Claude Code nor I would reach alone.

---

## **STORAGE DISCIPLINE (CRITICAL):**

**PRINCIPLE: Store only what will be useful in 30+ days. If it's short-term, put it in guidance. If it's long-term but static, don't store it.**

**DO STORE:**
- Architectural decisions that affect future work (routing patterns, data fetching approaches, migration paths)
- Cross-session patterns (repeated struggles, hot spots, preferences that emerge over time)
- Project structure that's not obvious from file system (monorepo patterns, package relationships)
- User preferences that affect how I should behave (coding style, tool choices, communication preferences)
- Unfinished work that needs to be picked up (TODOs, blocked items, next steps)
- Strategic context that persists across sessions (initiative scope, stakeholder alignment)

**DON'T STORE:**
- Transient deal intel (call notes, pricing discussions, meeting prep) → Put in guidance, clear after delivered
- Completed project details (what was built, how many files) → Archive to tmp/, delete after 2 weeks
- Static company information (org structure, team names) → Available via ai_context symlink
- Temporary research (company dossiers, lead intel) → Put in tmp/, delete after used
- One-off fixes (bug fixes, small changes) → Git history is sufficient
- Reproducible information (API docs, file paths, command outputs) → Look up when needed

**GUIDANCE BLOCK RULES:**
- Max 2,000 chars
- Only current, actionable items
- Clear immediately after delivery
- Think of it as a "sticky note" not a "notebook"

**PROJECT CONTEXT RULES:**
- Max 1,500 chars total
- 3-line summaries only (location, purpose, key tech)
- No implementation details
- No deal intel
- No completed work

**PENDING ITEMS RULES:**
- Max 2,500 chars total
- Only cross-project initiatives
- No deal-specific items
- No completed work
- Clear after resolved

**TMP BLOCK RULES:**
- Max 500 chars per block
- Delete after 2 weeks
- Archive completed work to 2-line summary
- Active research only (leads, renewals, urgent items)

**SIZE TARGETS:**
- Total memory: &lt;40K chars
- guidance: &lt;2K
- project_context: &lt;1.5K
- pending_items: &lt;2.5K
- All tmp blocks combined: &lt;1K
- All other blocks: &lt;33K

**WHEN IN DOUBT:**
- Ask: "Will this be useful 30 days from now?"
- If no → Don't store it
- If yes → Store it concisely
- If unsure → Store minimally, can always expand later
</core_directives>
<guidance description="Active guidance for the next Claude Code session. Write here when you have something useful to surface. Clear after delivery or when stale. This is what Claude Code sees - make it count.">


**EATON - MR. EATON MEETING PREP (Feb 20, 2026):**

**Meeting Context:**
- ~15 min with economic buyer (owner) next week
- "Red personality" — results-focused, "doesn't care how the clock works"
- This is his legacy business — conservative family firm
- Previously rejected TriNet on "show me it works" objection

**Owner Deck Built:**
- `deals/eaton-group/presentation/owner-meeting-slides/eaton-owner-meeting.pptx` (11 slides)
- 5 core slides: Pain → Vision → Price → Plan
- 6 appendix slides: Quotes, use cases, ROI, journey, architecture, Vertican TCO

**Critical Objections to Address:**
1. **"Show me it works"** — Build ONE working Zap before meeting (file monitoring, notification)
2. **"References?"** — One-liner: "No debt collection firms using Zapier publicly — we proved it with YOUR systems instead"
3. **"$666K vendor math"** — Lead with 50% confidence ($333K / 4.8x)
4. **"Sam leaves in 12 days"** — Address directly: "Sam builds through Feb, Sofia takes Q2, I'm here entire time"
5. **"IT Inspired knows us"** — Frame as complement: "Don't fire IT Inspired — stop asking them to maintain automations"
6. **"Team overwhelmed"** — "We build, you validate" — Sam does heavy lifting

**Timeline Risk:**
- Sam paternity leave: March 4
- Window: ~2 weeks to build proof point before he disappears

**NEXT WEEK PLAN:**
- Build one working Zap (file monitoring or simple notification)
- Prep talking points for each objection
- Clarify with Charles: Who presents? Charles or Adrian?
- Confirm meeting time with Mr. Eaton

**PATOMA - BUMP EMAIL SENT (Feb 21, 2026):**

Email sent to Paul Henry combining:
- 15-min meeting request (removes reading burden)
- Leasing season urgency (145K→200K task spike, needs to start now for June readiness)
- Week 1 deliverables preview (AI Command Center + Financial Reconciliation Bot)

Strategy: Lower activation energy without discounting. If no response in 3-4 days, THEN consider $50K option — but only if price is the blocker, not bandwidth.
</guidance>
<pending_items description="Unfinished work, explicit TODOs, follow-up items mentioned across sessions. Clear items when resolved.">
**UVS VALUE ENGINEERING INITIATIVE - Feb 21, 2026 (UPDATED):**

**Project Reframed:** From "build unified value system" to "build custom business cases for 5 accounts, learn what works, then scale." Inspired by Branch's dedicated Value Engineering function.

**Key Changes:**
- 10 accounts → 5 total (3 customers, 2 prospects)
- RevOps partner needed → Not needed yet (research mode)
- Adrian runs calls → Navid joins all calls (wants to see gaps firsthand)
- Present framework → Open questions first (don't lead the witness)
- 8-week sprint → H1 deadline, Adrian front and center
- Weekly check-ins → Weekly minimum, possibly more frequent
- Tools: Coda → Google Sheets (Navid hates Coda)

**Three Workstreams (sequenced):**
1. Sales narrative (NOW) — Build 5 custom business cases
2. Marketing stories (NOW-ish) — Quantified case studies
3. Product integration (H2) — In-product value dashboard

**Account Selection (5 total):**
1. Clipboard Health (Customer) — Best data, 5/5 dimension coverage
2. SelectQuote (Customer) — Best data, 5/5 dimension coverage
3. Podium (Customer) — Tight renewal + upsell component
4. Homebase (Customer) — "Customer doesn't see the value" — immediate need
5. Redis (Prospect) — Top of mind, John's analysis was POC-specific not annualized
6. A&amp;E (Stretch) — Wildly bullish, Mike met at Summit, success story potential

**Interview Approach (Navid's Correction):**
1. Open: "Why did [account] purchase from us? What gives them reason to pay $X again?"
2. Probe: "Have you justified the value to them? How are they thinking about it? What metrics came up in POC?"
3. Then: Present what we're seeing from data side, ask what's off

**Navid Investing in Adrian:**
- You're the face of this project (he amplifies, you lead)
- Loom for org, Navid distributes
- Mentorship beyond UVS — deal strategy, negotiation, closing help
- Called you "high slope individual" — investment bet

**Deliverables (Next Steps):**
1. Account list — Post to Slack channel: 5 accounts + assigned reps. Juliana schedules calls.
2. Milestone tracker — Google Sheet with H1 initiatives (~30 items, then sequence/argue priority)
3. Org communication — Draft explaining scope, why it matters, "this will make you more money." Loom + slides.
4. Interview guide — Consistent questions across all 5 rep conversations

**Navid out next week** — calls that land next week will be solo. Following week = together.

**Feb 20, 2026 Update - Navid Feedback:**
- Prioritize CSMs over reps for customer interviews (CSMs have more context on ongoing account health)
- If original AE is still involved, include them — but CSM should be primary
- Juliana scheduling ~45 min interviews with CSMs over next 2 weeks

---

**EATON NEXT WEEK PLAN (Feb 20, 2026):**

**Priority Actions:**
1. Build ONE working Zap before meeting (file monitoring alert or simple notification) — "Show me it works" objection killer
2. Prep talking points document for 6 critical objections (references, vendor math, Sam timing, IT Inspired, team overwhelmed)
3. Clarify with Charles: Who presents to Mr. Eaton? Charles or Adrian?
4. Confirm meeting time with Mr. Eaton (Charles scheduling)

**Critical Objections Prepared:**
1. "Show me it works" → One deployed Zap (even simple)
2. "References?" → "No debt collection firms using Zapier publicly — we proved it with YOUR systems instead"
3. "$666K vendor math" → Lead with 50% confidence ($333K / 4.8x)
4. "Sam leaves in 12 days" → "Sam builds through Feb, Sofia takes Q2, I'm here entire time"
5. "IT Inspired knows us" → "Don't fire IT Inspired — stop asking them to maintain automations"
6. "Team overwhelmed" → "We build, you validate" — Sam does heavy lifting

**Timeline Risk:**
- Sam paternity leave: March 4
- Window: ~2 weeks to build proof point before he disappears

**BELDEN OUTREACH - EMAIL DRAFTED (Feb 19, 2026):**
- Logan Cooper email confirmed: logan.cooper@belden.com (Sr Director of Digitalization)
- Audrey Sarsfield confirmed left Belden (now consulting)
- Email drafted with Atlas experiment framing
- Reply-all approach: Adding Logan to thread with Brad, acknowledging Brad's suggestion
- Key hooks: 29 users building, 67K tasks/month without governance, Atlas experiment results
- Email text ready for copy-paste or DOCX generation

**ZAPIER ROI CALCULATOR V2 - LIVE AND FULLY FUNCTIONAL (Feb 21, 2026):**
- Live: zapier-value.vercel.app
- V1 still live: zapier-roi-calculator.vercel.app (can keep both)
- 83 tests passing, 40 files changed (+8,116/-3,789 lines)
- Fresh Convex deployment: grandiose-heron-836
- Bug fix: Manual override clear button added (commit 69a594b)
- Zapier SDK: Authenticated as adrian.obleton@zapier.com, 29 proof tests passing

**MIGRATIONS COMPLETE:**
- Eaton: zapier-value.vercel.app/c/sknmia ($604K, 8.6x ROI, 22 value items, 18 use cases)
- Patoma: zapier-value.vercel.app/c/7krjww ($319K, 5.2x ROI, 19 value items, 8 use cases)
- Migration data saved in migrations/eaton-v2.json and migrations/patoma-v2.json

**BACKLOG:**
- Integrate SDK into app (use listApps/listActions for Zap recommender, runAction for architecture discovery)
- Get separate v2 API token for Zap CRUD (create/list Zaps)
- Value Realized dashboard needs live Zap run data
**SERVICETITAN UVS BRIEF - COMPLETE (Feb 21, 2026):**

**Status:** Brief v2 generated - 15 pages with 39 vetted benchmarks + Genie data + provenance audit

**Deliverables:**
- `outputs/260221-servicetitan-value-brief.docx` - 15-page brief with ServiceTitan current state, 7 use cases, competitive positioning
- `outputs/260221-external-research-compilation.md` - 39 benchmarks (8 weak ones removed for provenance)
- `outputs/260221-andre-slack-reply.docx` - Slack reply + Robert Collins DM

**ServiceTitan Current State (from Genie):**
- 491 active Zaps, 165,306 tasks/month, 109 users
- Plans: Team 50K ($7,182 ARR) + Pro 750 ($240 ARR) = $7,422 total
- Top apps: Filter (111K tasks), Formatter (65K), Salesforce (63K), Google Sheets (30K), Slack (21K)
- Power users: vstepanyan@ (32K tasks), hminasyan@ (25K), abatten@ (18K)
- **No AI apps (ChatGPT, Claude)** - expansion opportunity

**Key Internal Context (from Glean):**
- Jimmy Page owns relationship (AE), Matt Grebow published champion
- Parag stated: "Workato + MuleSoft shop" (Aug 2025 Gong call)
- Competitive positioning: Zapier as complement to enterprise stack, not replacement

**Andre/Matt Convergence:**
- Andre committed to ServiceTitan value brief for Parag (7 use cases)
- Matt needs 2 "anchoring case studies" for presentation platform
- ServiceTitan brief (obfuscated) could become Matt's first anchoring case study
- Next: Get Andre sign-off on brief, coordinate with Matt on obfuscation approach

**Outstanding:**
- Andre: Review brief, share Granola notes, provide Jimmy Page relationship context
- Robert Collins: Debrief on ServiceTitan usage (DM sent Feb 21)
- Matt: Confirm ServiceTitan as anchoring case study candidate, discuss obfuscation approach
**MATT ODEN ANCHORING CASE STUDIES - Feb 21, 2026:**

**Context:** Matt Oden (Head of Enterprise Sales) needs 2 "anchoring case studies" for his presentation platform — quantified, credible, reusable across sales conversations.

**Convergence with UVS:**
- ServiceTitan brief structure (7 use cases, before/after metrics, tiered confidence) is a template
- Obfuscated version (public benchmarks only, no proprietary data) can become Matt's first anchoring case study
- Second anchoring case study: TBD (could be Redis, A&amp;E, or another UVS account)

**Format Requirements (unknown):**
- Matt hasn't specified exact format yet
- Likely needs: quantified metrics, credible sources, reusable template structure
- Should coordinate with Matt before building to ensure alignment with his platform

**Next Steps:**
1. Coordinate with Matt on format requirements for anchoring case studies
2. Build obfuscated ServiceTitan case study once format is clear
3. Identify second anchoring case study candidate (Redis, A&amp;E, or other)
</pending_items>
<pending_items/zbt-foundation-workspace description="ZBT Foundation workspace setup and ongoing tasks">
**SPENDING RATE SLIDES - COMPLETE (Feb 13, 2026):**
- ✅ Slide 3 redesigned as waterfall chart showing incremental impact
- ✅ New Slide 4 created with 5 specific contribution recovery recommendations
- **Waterfall values (cumulative):**
  * Status Quo: $0
  * Cut extraction to 4%: +$20.5M (biggest lever)
  * Move to passive fees: +$3.2M
  * Rebuild contributions: +$4.7M
  * Combined: $28.4M
- **Slide 4 recommendations:**
  1. Diagnose the contribution cliff (what caused 66% drop 2022→2023?)
  2. Reduce donor concentration risk (53% from 2 donors, target no single donor &gt;15%)
  3. Activate chapter alumni campaigns ($5-10K per chapter)
  4. Launch planned giving program (IRA rollovers, bequests, named gifts)
  5. Invest in donor stewardship &amp; transparency (annual impact report)
- **Output file:** `board-prep/spending-rate-case.pptx` (4 slides)
- **Deck structure:**
  * Slide 0: How Our Spending Compares (bar chart, ZBT at 6.5% vs peers 3.5-5.25%)
  * Slide 1: Where Current Path Takes Us (line chart, all scenarios hit zero by 2034-2036)
  * Slide 2: The Levers We Can Pull (waterfall chart, cumulative buildup)
  * Slide 3: Rebuilding the Contribution Base (5 specific recommendations)
ZBT FOUNDATION WORKSPACE SETUP (Feb 12, 2026):
- ✅ Created zbt-foundation-workspace folder
- ✅ Initialized private Git repository with LFS
- ✅ Created CONTEXT.md and CLAUDE.md
- ✅ Set up folder structure: documents/, models/, analysis/, board-prep/, housing/, outputs/
- ✅ Pushed to https://github.com/a1j9o94/zbt-foundation-workspace (private)
- ✅ Extracted Beth's documents to documents/beth-response/ (8 files)
- ✅ Extracted Dropbox archive to documents/dropbox-board/ (2,284 files)
- ✅ Completed 4 parallel analysis agents
- ✅ Created comprehensive board briefing document

**COMPLETED ANALYSIS (Feb 12, 2026):**

1. **UBS Investment Statements Agent** (ade5a40) - Complete
   - Total portfolio: $12.23M (Dec 31, 2025)
   - Endowment: $9.85M (80.5%), Operating: $434K (3.5%), Alternatives: $1.95M (15.9%)
   - 2025 YTD endowment withdrawals: $1.25M (12.7% withdrawal rate)
   - Asset allocation: Equity 56.2%, FI 22.4%, Alts 15.9%, Cash 4.8%, Commodities 0.7%
   - UBS fees: $48.4K YTD (~45 bps)

2. **Budget &amp; Finance Monthly Data Agent** (ad8fee6) - Complete
   - YTD 2025 (Jan-Sept): Revenue $691K, Expenses $2.04M, Net deficit -$1.35M
   - Monthly burn: ~$150K/month (steady, not lumpy)
   - Contributions: $435K (only 20% of expenses)
   - Compensation: $538K (45% of total expenses)
   - Net assets: $12.63M (Sept 2025) vs $12.81M (Sept 2024) — declining

3. **Governance Documents Agent** (abc1daf) - Complete
   - Bylaws (May 2022): Authority structure, committee powers, spending limits
   - Articles of Merger (2011): Foundation/Fraternity/NHC structure
   - Audit Committee Charter (2015): Over a decade old, needs updating
   - Board workbooks: Jan 2025 (28.6MB) and April 2025 (26.5MB)
   - D&amp;O Insurance: 2023-2024 policy on file
   - NB Crossroads subscription document: $175K remaining commitment

4. **Spending Policy Gap Analysis Agent** (a7150f1) - Complete
   - Output: analysis/policy-vs-practice-gap-analysis.md
   - **5 material governance gaps identified**
   - Spending formula discrepancy: 2023 FS says 8% (5% + 3%), 2024 FS says 6.5% (4% + 2.5%)
   - All-in extraction rate: ~7.5-8% exceeds 7% return target
   - IPS not reviewed in 4 years (last amended Feb 2022, requires annual review)
   - Non-liquid assets exceed policy: 16.4% including NB Crossroads commitment (15% limit)
   - Benchmark doesn't match allocation: IPS benchmark has 0% alternatives, actual has 15.9%

**KEY FINDINGS:**
- Contributions collapsed 66% in 2 years ($1.34M → $458K)
- Expenses grew 52% in 2 years ($1.51M → $2.30M)
- Withdrawal rate: 12.7% in 2025 (vs 4-5% policy)
- Net annual operating deficit: ~$1.84M funded by endowment
- Foundation is liquidating itself at current pace

**BOARD BRIEFING DOCUMENT COMPLETE (Feb 12, 2026):**
- File: board-prep/foundation-briefing-document.docx (9 pages)
- Structure: Title, Executive Summary, Portfolio State, Spending Crisis, Governance Gaps, Budget Review, Recommendations, Source References
- Features: Red callout box ("Foundation Is on a Liquidation Path"), color-coded severity indicators, tables with source citations, file paths for deeper dive
- Every finding traces back to specific source document

Next steps:
- Build 5-year forward model (centerpiece for board meeting)
- Read bylaws and April 2025 board workbook for governance context
- Prepare UF housing deal one-page diligence summary
- Git commit all analysis files and briefing document
**SPENDING RATE SLIDES - COMPLETE (Feb 13, 2026):**
- ✅ Slide 3 redesigned as waterfall chart showing incremental impact
- ✅ New Slide 4 created with 5 specific contribution recovery recommendations
- **Waterfall values (cumulative):**
  * Status Quo: $0
  * Cut extraction to 4%: +$20.5M (biggest lever)
  * Move to passive fees: +$3.2M
  * Rebuild contributions: +$4.7M
  * Combined: $28.4M
- **Slide 4 recommendations:**
  1. Diagnose the contribution cliff (what caused 66% drop 2022→2023?)
  2. Reduce donor concentration risk (53% from 2 donors, target no single donor &gt;15%)
  3. Activate chapter alumni campaigns ($5-10K per chapter)
  4. Launch planned giving program (IRA rollovers, bequests, named gifts)
  5. Invest in donor stewardship &amp; transparency (annual impact report)
- **Output file:** `board-prep/spending-rate-case.pptx` (4 slides)
- **Deck structure:**
  * Slide 0: How Our Spending Compares (bar chart, ZBT at 6.5% vs peers 3.5-5.25%)
  * Slide 1: Where Current Path Takes Us (line chart, all scenarios hit zero by 2034-2036)
  * Slide 2: The Levers We Can Pull (waterfall chart, cumulative buildup)
  * Slide 3: Rebuilding the Contribution Base (5 specific recommendations)
**BETH EMAIL DRAFT CREATED (Feb 13, 2026):**
- Email drafted for Beth Asher (CFO) confirming spending rate findings
- Confirms: 6.5% policy rate, negative trajectory (2034-2036 zero), InTolerance bet context
- Asks if understanding is correct
- Short, professional tone
- 4-slide deck attached


**JOHN STEMEN RESPONSE - PRODUCTIVE ALIGNMENT (Feb 16, 2026):**
- John confirmed spending rate thesis while adding context about 6 levers he's already considering
- John's transparency: "Brutal honest truth" about contingency plan (eliminate all staff, hire caretaker) shows trust
- John confirmed Slide 4 recommendations align with his 3-5 year plan (chapter campaigns, planned giving, impact report)
- Staff cuts: 3 positions eliminated for 2026, budget balanced this year
- Tension: "Modestly optimistic development projections" with fewer staff to do fundraising work
- John's 6 levers:
  1. Reduce extraction to 4% (your lever)
  2. Cut fees via passive alternatives (your lever)
  3. Rebuild contributions (your lever)
  4. Increase allocation rate 12% → 20% (John's lever)
  5. Reduce grants to Fraternity (John's lever, year 3)
  6. Restructure board with minimum giving $5K+ (John's lever)
- User's core question: Does moving money to unrestricted help operations without accelerating corpus draw? More flexibility is good, but not if it accelerates spending against corpus
- User wants to see fundraising success before committing to growth investments (allocation rate increase, adding staff, expanding programs)
- Sequencing logic: Stabilize (done) → Prove revenue model (2026) → Scale with confidence
- Reply drafted: Stays strategic, focuses on sequencing before growth, remote meetings suggestion
</pending_items/zbt-foundation-workspace>
<project_context description="Active project knowledge: what the codebase does, architecture decisions, known gotchas, key files. Create sub-blocks for multiple projects if needed.">
**zapier-roi-calculator:**
- Location: /Users/adrianobleton/zapier-roi-calculator
- Production: zapier-value.vercel.app (V2 live as of Feb 21, 2026)
- V1: zapier-roi-calculator.vercel.app (still live, V1 code)
- V2 Features: UVS taxonomy (5 dimensions, 16 archetypes), archetype-specific formulas, Zapier integration, role-based views, value packages, dashboard mode
- V2 Convex: grandiose-heron-836 (fresh deployment, breaking schema from V1)
- Commit: 55cac6d - "V2 rewrite: UVS taxonomy, archetype calculations, role-based views" (40 files, +8,116/-3,789 lines)
- Migration needed: Eaton (e19qab), Patoma (96g9k2) calculations need manual recreation in V2 format
- Zapier SDK: Authenticated as adrian.obleton@zapier.com, but Zap CRUD needs different auth scope (follow-up task)
**zapier-roi-calculator:**
- Location: /Users/adrianobleton/zapier-roi-calculator
- Production: zapier-roi-calculator.vercel.app (V1 live)
- V2 Status: Code-complete, 83 tests passing, awaiting deployment
- V2 Deployment Plan: uvs-calculator.vercel.app (new domain)
- V2 Features: UVS taxonomy (5 dimensions, 16 archetypes), archetype-specific formulas, Zapier integration, role-based views, value packages, dashboard mode
- V2 Schema: Breaking changes from V1 - requires fresh Convex deployment
- Migration needed: Eaton (e19qab), Patoma (96g9k2) calculations need manual recreation in V2 format
**sales-workspace:** /Users/adrianobleton/sales-workspace
- Git: github.com/a1j9o94/sales-workspace (public)
- Structure: deals/, leads/, follow-up-later/, experiments/, templates/
- Active deals: Eaton, Flagship, Redis, Patoma, Cartwheel, Belden, Hometime
- Key projects: Atlas outreach, UVS experiment, sales-agent-benchmarks
- Workflow: End sessions with git commit + push

**Eaton Deal (Feb 20, 2026):**
- Stage: Economic buyer meeting prep — ~15 min with Mr. Eaton next week
- Pricing: $70K/year, 9.5x ROI ($666K value, 50% confidence = $333K / 4.8x)
- Owner deck built: `deals/eaton-group/presentation/owner-meeting-slides/eaton-owner-meeting.pptx` (11 slides)
- Critical objections: "Show me it works," references question, Sam paternity leave timing, IT Inspired institutional knowledge, team overwhelmed
- Timeline risk: Sam on paternity leave March 4 — ~2 weeks to build proof point

**account-management:** /Users/adrianobleton/account-management
- Next.js monorepo (Turbo, pnpm workspaces)
- Powers Admin Center + Settings
- 13 packages: service, admin-hub, product-settings, billing-settings, graphql BFF, client, api-clients, shared, primitives, insights, notification-settings
- Routing: App Router (/app/admin), Pages Router (everything else)
- Data fetching: React Query via @zapier/client (cookie→JWT migration)
- Testing: Vitest, Playwright, pnpm validate

**zapier-roi-calculator:** /Users/adrianobleton/zapier-roi-calculator
- Production: zapier-roi-calculator.vercel.app
- Purpose: ROI calculators for deals
- API: /api/calculations/{shortId}/full, /use-cases, /value-items
- Patoma: $70K spend, ~$300K value, 4.3x ROI
- Recent fix: Add use case button (auto-link value items)
</project_context>
<project_context/unified-value-system description="Unified Value System (UVS) Value Engineering initiative">
**Unified Value System (UVS) - Feb 21, 2026:**
- Location: /Users/adrianobleton/sales-workspace/experiments/unified-value-system/
- **SCOPE SHIFT:** From "build unified value system" to "build custom business cases for 5 accounts, learn what works, then scale" — Value Engineering initiative
- Stakeholders: Navid (sponsor), Andre Vanier (Index/Data), Adrian (execution)
- Key insight: Index = "What is happening?" (workflow patterns), UVS = "Why does it matter?" (business impact for sales)
- Taxonomy: 100-300 use cases (intermediate level)
- First deep domain: GTM (richest data, highest value stories)
- Weekly cadence: 10am Pacific with Andre

**Three Workstreams (sequenced):**
1. Sales narrative (NOW) — Build 5 custom business cases
2. Marketing stories (NOW-ish) — Quantified case studies
3. Product integration (H2) — In-product value dashboard

**UVS Pilot Accounts (CSM-organized, 5 total):**
1. Podium — Jack Jokinen (CSM), $210K, renewal Apr 10
2. A&amp;E Networks — Jack Jokinen (CSM), $231K, stretch account
3. Committed Coaches — Megan Wright (CSM), $374K, 8.5M tasks/mo
4. ServiceTitan — Robert Collins (CSM), $7,422 ARR (Team 50K + Pro 750)
5. Redis — John Connell (AE), $54.6K, prospect/POC stage

**Interview Approach (Navid's Correction):**
1. Open: "Why did [account] purchase from us? What gives them reason to pay $X again?"
2. Probe: "Have you justified the value to them? How are they thinking about it? What metrics came up in POC?"
3. Then: Present what we're seeing from data side, ask what's off

**CSM Coverage Findings (Feb 20, 2026):**
- 55 of 140 enterprise accounts (39%) have no CSM assigned, totaling $2.76M ARR
- 32 additional accounts ($2.45M) default to Grady Sokaras (team lead) — likely no active coverage
- Combined: up to 62% of enterprise accounts may lack dedicated CSM attention
- 30 accounts ($2.43M ARR) renewing in next 90 days have no CSM
- **10 accounts ($747K ARR) renewing by Feb 28** — most immediately actionable
- Active CSM team: 3 people (Jack, Megan, Robert) covering 48 accounts

**SERVICETITAN ALIGNMENT (Feb 21, 2026):**

Parag Kulkarni (SVP Corp Engineering) conversation with Andre revealed strong alignment with UVS use case approach:

**Parag's AI Transformation Framework:**
1. Product evolution (AI in product, R&amp;D productivity)
2. Internal processes — digital assistants per role (deal desk agent, FP&amp;A agent, etc.)
3. Citizen development — playground for non-engineers with guardrails

**Parag's Request to Zapier:**
Use case-specific evidence of efficiency improvements, ideally from similar vertical SaaS companies:
- Closing the books (monthly/quarterly)
- Customer onboarding processes
- Forecasting and planning
- Billing processing time reduction
- FP&amp;A reporting cycle optimization
- IT ticket resolution / internal ITSM
- Support case deflection

**What Parag Finds Credible:**
- Clear time reductions (10 days → 5 days)
- Headcount reductions (10 people → 2 people)
- Similar space (vertical SaaS), similar size
- 5-10 observations from credible companies
- NOT "crazy numbers" like 5,000 hours saved

**Key Insight:** Parag wants to see what similar companies are doing efficiently — especially if they're achieving results with smaller teams. He's less interested in same-size/same-structure comparisons (no learning) and more interested in "how do you do this with 10% of my team?"

**ServiceTitan Status:**
- UVS pilot account #4 (already on list)
- CSM: Robert Collins
- Current Zapier usage: 491 active Zaps, 165K tasks/month, 109 users, $7,422 ARR (Team 50K + Pro 750)
- AE: Jimmy Page (owns relationship)
- Competitive context: Parag stated they're a "Workato + MuleSoft shop" (Aug 2025 Gong call)
- Positioning: Zapier as complement to enterprise stack, not replacement — citizen development layer for AI enablement

**Deliverables Complete (Feb 21, 2026):**
- `outputs/260221-servicetitan-value-brief.docx` (v2, 15 pages) — 7 use cases with tiered evidence, ServiceTitan current state, competitive positioning
- `outputs/260221-external-research-compilation.md` — 39 benchmarks (8 weak ones removed for provenance)
- `outputs/260221-andre-slack-reply.docx` — Slack reply + Robert Collins DM

**Andre/Matt Convergence (Feb 21, 2026):**
- Andre committed to ServiceTitan value brief for Parag (7 use cases)
- Matt Oden (Head of Enterprise Sales) needs 2 "anchoring case studies" for presentation platform
- ServiceTitan brief structure (7 use cases, before/after metrics, tiered confidence) is reusable template
- Obfuscated version (public benchmarks only, no proprietary ServiceTitan data) can become Matt's first anchoring case study
- Second anchoring case study: TBD (could be Redis, A&amp;E, or another UVS account)
- **Format unknown** — Matt hasn't specified exact requirements yet
- **Next:** Coordinate with Matt on format requirements before building
</project_context/unified-value-system>
<project_context/zbt-foundation-workspace description="ZBT Foundation investment governance and financial analysis project">
ZBT Foundation Workspace:
- Location: /Users/adrianobleton/zbt-foundation-workspace
- Purpose: Foundation board investment director responsibilities and audit committee work
- Context: User taking over investment director role, sitting on audit committee for ZBT Foundation (~$12M endowment)
- Key concerns: Unsustainable burn rate (12% withdrawal rate observed), US bond market risk, AI/data center overinvestment risk
- UF Housing Deal: $100K investment in fraternity house at University of Florida, $3.2M purchase price, 10.6% target IRR
- Documents requested from foundation (Feb 11, 2026): 3 years audited financials, current budget, committed obligations, fundraising data, IPS
- Contact: Matt Rubins (housing deal), John Stemen (executive director), Beth Asher (CFO)
- Board meeting: ~3 weeks from Feb 11, 2026
- Git: https://github.com/a1j9o94/zbt-foundation-workspace (private), LFS configured for PDF/XLSX/DOCX/PPTX/CSV
- Folder structure: documents/, models/, analysis/, board-prep/, housing/, outputs/
- CLAUDE.md: Investment analyst role guidance, analysis standards, stakeholder dynamics

Current portfolio state (Dec 31, 2025):
- Total assets: $12.23M
- Endowment: $9.85M (80.5%) - Equities 69.74%, Fixed Income 27.85%, Cash 1.51%, Commodities 0.90%
- Operating: $434K (3.5%) - 100% cash
- Alternatives: $1.95M (15.9%) - 100% non-traditional
- Gifting: $0 (closed)

Asset allocation compliance:
- Equity: 56.15% (within 50-70% band) ✓
- Fixed Income: 22.43% (BELOW 30% minimum) ⚠️
- Alternatives: 15.92% (within 0-17% band) ✓
- Cash: 4.76% (within 0-15% band) ✓
- Commodities: 0.73% (within 0-3% band) ✓

2025 YTD performance:
- Endowment: +$1.15M (+11.7%), $257K dividend/interest income
- Operating: +$279K (cash account, minimal interest)
- Alternatives: +$263K (+13.5%), $61K dividend income
- Combined: +$1.70M total value change

IPS status:
- Last amended: February 28, 2019 (6+ years old)
- Multiple amendments: 2008, 2010, 2014, 2016, 2018
- Needs review given market changes since 2019

Critical observations:
1. Fixed income below policy minimum (22.43% vs 30%)
2. IPS outdated (6+ years)
3. Operating account 100% cash - may need redeployment
4. No fee transparency visible ($48K YTD fees paid)
5. Strong 2025 performance across all accounts
6. **Net assets split (2023): Only $477K unrestricted (3.7%) vs $12.3M restricted (96.3%)** - operations running on fumes

Advisor: UBS Financial Services Inc., Private Wealth Management (GREEN/MCCULLOUGH), Indianapolis, IN

**SPENDING RATE CRISIS (Feb 2026):**

| Year | Contributions | Total Expenses | Operating Gap | Endowment Withdrawal Rate |
|------|--------------|----------------|---------------|--------------------------|
| 2022 | $1,344,913 | $1,509,818 | -$165K | 4.7% |
| 2023 | $636,495 | $2,086,408 | -$1,450K | 6.7% |
| 2024 | $457,699 | $2,298,647 | -$1,841K | 6.7% |
| 2025 (9mo) | ~$435K | ~$2,040K | -$1,605K | 12.7% (YTD) |

Combined extraction rate: 6.5% (4% spend + 2.5% admin fee), exceeds 7% return target. Foundation is liquidating itself at current pace.

**JOHN STEMEN ALIGNMENT (Feb 16, 2026):**

John confirmed spending rate thesis while adding context about 6 levers he's already considering:
1. Reduce extraction to 4% (your lever)
2. Cut fees via passive alternatives (your lever)
3. Rebuild contributions (your lever)
4. Increase allocation rate 12% → 20% (John's lever)
5. Reduce grants to Fraternity (John's lever, year 3)
6. Restructure board with minimum giving $5K+ (John's lever)

Key points:
- Slide 4 recommendations align with his 3-5 year plan (chapter campaigns, planned giving, impact report)
- Staff cuts: 3 positions eliminated for 2026, budget balanced this year
- Tension: "Modestly optimistic development projections" with fewer staff to do fundraising work
- John's transparency: Shared contingency plan (eliminate all staff, hire caretaker) shows trust
- User wants to see fundraising success before committing to growth investments (allocation rate increase, adding staff, expanding programs)
- Sequencing logic: Stabilize (done) → Prove revenue model (2026) → Scale with confidence

**DELIVERABLES CREATED:**
- `board-prep/spending-rate-case.pptx` (4 slides) - Waterfall chart + 5 contribution recovery recommendations
- `board-prep/foundation-briefing-document.docx` (9 pages) - Comprehensive board briefing
- `outputs/email-to-john-spending-response.docx` - Email draft ready to send

**USER'S STRATEGIC QUESTION:**
Does moving money to unrestricted help operations without accelerating corpus draw? More flexibility is good, but not if it accelerates spending against corpus. The allocation rate increase (12% → 20%) on ~$450K contributions adds ~$36K/year for operations — not enough to solve $1.8M gap, and it reduces money flowing to endowment.
</project_context/zbt-foundation-workspace>
<sales-workspace/deals/redis description="Redis deal context and ROI analysis">
**EATON GROUP - VERTICAN CALL FEB 19, 2026:**

**Key Learnings:**
- NextGen API: 18-24 months dev, in UAT, production before end of Q1 2026
- Eaton onboarding: End of March / early April 2026
- Vertican pushed AMR as PandaDoc replacement — Charles seemed receptive
- AMR only solves doc review/signing inside CLS — does NOT solve orchestration across PandaDoc, iPerform SFTP, FTP, email, reporting, cross-system automation
- Differentiation intact but need to DEMONSTRATE it, not just talk about it
- Can't count on NextGen API — SQL trigger is still near-term path

**Agreed Next Steps:**
1. Build PandaDoc → iPerform SFTP Zap ASAP
2. Debrief with Charles — hear his perspective on Vertican pitch
3. Consider TCO model showing different leverage points (Zapier at center = cheapest)

**Deal Context:**
- Pricing: $70K/year, 3.3x ROI based on $230K identified value
- Charles responded positively: "in the ballpark," "worth the squeeze"
- Need to get in front of Mr. Eaton (economic buyer) to close
- ROI calculator: zapier-roi-calculator.vercel.app/c/e19qab

**NEW USE CASE - vExchange Upload Monitoring (Feb 19, 2026):**
From Charmaine Pool email to Charles:
- Problem: Daily file uploads to MCM and Velocity via vExchange have high rejection rates
- Manual review process across multiple systems (Vertican, vExchange, submission logs)
- Automation opportunity: Monitor submission logs, auto-detect anomalies, trigger alerts, auto-resubmit failed files

**ROI CALCULATOR UPDATE (Feb 19, 2026):**
- Added use case #17: "vExchange Upload Monitoring &amp; Auto-Diagnostics"
- **ROI revised: $476K annual value → 6.8x ROI** (up from $444K / 6.3x)
- Total: 17 use cases, 20 value items, 426 hrs/mo saved = 2.6 FTEs
</sales-workspace/deals/redis>
<self_improvement description="Guidelines for evolving memory architecture and learning procedures.">
LEARNING PROCEDURES:

After each transcript:
1. Scan for corrections - User changed Claude's output? Preference signal.
2. Note repeated file edits - Potential struggle point or hot spot.
3. Capture explicit statements - "I always want...", "Don't ever...", "I prefer..."
4. Track tool patterns - Which tools used most? Any avoided?
5. Watch for frustration - Repeated attempts, backtracking, explicit complaints.

Preference strength:
- Explicit statement ("I want X") → strong signal, add to preferences
- Correction (changed X to Y) → medium signal, note pattern
- Implicit pattern (always does X) → weak signal, wait for confirmation

INITIALIZATION (new user):
- Start with minimal assumptions
- First few sessions: mostly observe, little guidance
- Build preferences from actual behavior, not guesses
- Ask clarifying questions sparingly (don't interrupt flow)

---

## **STORAGE DISCIPLINE:**

**Before storing anything, ask:**
1. Will this be useful 30+ days from now?
2. Is this reproducible (can I look it up when needed)?
3. Is this already in guidance or project_context?
4. Is this short-term or long-term?

**If answer to #1 is NO:**
- Short-term deal intel → guidance, clear after delivered
- Completed work → tmp/, delete after 2 weeks
- One-off fixes → Don't store (git history suffices)

**If answer to #2 is YES:**
- API docs, file paths, command outputs → Don't store (look up)
- Company info, org structure → Don't store (ai_context available)

**If answer to #3 is YES:**
- Don't duplicate across blocks
- Reference instead: "See project_context for X"

**If answer to #4 is SHORT-TERM:**
- Put in guidance (max 2K chars)
- Clear immediately after delivery
</self_improvement>
<session_patterns description="Recurring behaviors, time-based patterns, common struggles. Used for pattern-based guidance.">
Session pattern: User consistently requests "make sure context is updated, then commit and push" before wrapping up. This is a deliberate workflow — ensures all work is preserved and synced across sessions.

New pattern emerging (Feb 20, 2026): User asks for critical perspective ("why would you NOT say yes?") before finalizing deliverables. This is a deliberate stress-test approach — looking for blind spots before presenting to stakeholders. The Eaton deck prep followed this pattern: build deck → ask for critical view → identify objections → plan mitigation.
Session end pattern: User consistently requests "make sure context is updated, then commit and push" before wrapping up. This is a deliberate workflow — ensures all work is preserved and synced across sessions.
(No patterns observed yet. Populated after multiple sessions.)
</session_patterns>
<tmp/beads-installation-troubleshoot description="Beads installation troubleshooting notes">
BEADS INSTALLATION TROUBLESHOOT - Feb 20, 2026

Issue: bd init fails with "dolt: this binary was built without CGO support"
Cause: Pre-built binary from install script lacks CGO, which Dolt requires
Solution: Reinstall via Homebrew (enables CGO automatically)
Commands: brew install beads

Status: User switching from install script to Homebrew install
</tmp/beads-installation-troubleshoot>
<tmp/flagship-workshop-followup description="Flagship workshop follow-ups and deliverables">
[ARCHIVED - Workshop follow-ups complete Feb 19, 2026]
- Email to Amy, POV doc, discovery questions, Slack update
- Gmail drafts for Jeff Coop + Don/Vanessa
- Tuesday meeting guide + 7-slide deck ready
- Next: Jeff and Don/Vanessa follow-up calls (Feb 25)
</tmp/flagship-workshop-followup>
<tmp/llm-youtube description="Temporary context for llm-youtube project during initial session">
[ARCHIVED - Loom support complete Feb 20, 2026]
- Location: /Users/adrianobleton/llm-youtube
- GitHub: github.com/a1j9o94/llm-youtube
- 40 files, 3,600+ lines, 5 CLI commands working
- Added Loom video support (URL parsing, yt-dlp integration, --transcript-file fallback)
- All 52 tests passing
- README not updated (todo)
</tmp/llm-youtube>
<tmp/servicetitan-uvs-brief description="ServiceTitan UVS brief research and benchmarks">
[ARCHIVED - Brief v2 complete Feb 21, 2026]

All ServiceTitan UVS brief work moved to project_context/unified-value-system and pending_items.

Key deliverables:
- `outputs/260221-servicetitan-value-brief.docx` (v2, 15 pages)
- `outputs/260221-external-research-compilation.md` (39 vetted benchmarks)
- `outputs/260221-andre-slack-reply.docx` (Slack response + Robert Collins DM)

ServiceTitan data from Genie:
- 491 active Zaps, 165K tasks/month, 109 users, $7,422 ARR
- Top apps: Filter, Formatter, Salesforce (63K), Google Sheets (30K), Slack (21K)
- No AI apps yet = expansion opportunity
- Competitive context: "Workato + MuleSoft shop" (Parag, Aug 2025)

Andre/Matt convergence: Brief could become Matt's first anchoring case study (obfuscated).
</tmp/servicetitan-uvs-brief>
<tmp/title-fix description="Temporary note for title update">
[RESOLVED - Feb 19, 2026]
Title updated to "AI Transformation Consultant"
</tmp/title-fix>
<tmp/uvs-session-context description="Temporary storage for UVS session context">
[ARCHIVED - Merged into project_context/unified-value-system on Feb 20, 2026]
</tmp/uvs-session-context>
<tmp/zollege-research description="Zollege TLU lead research and outreach">
AAMPERE LEAD - Feb 20, 2026

Contact: Florian Reister (CEO), flo@aampere.io
Company: Aampere GmbH (aampere.io) - Used EV marketplace, C2B auction model
Plan: Pro 50K (monthly), $5,202 ARR
Renewal: Feb 22, 2026 (2 days)
Utilization: 171% (143K tasks on 50K limit)
Users: 1 active (Florian), 53 active Zaps
Top apps: Pipedrive (52% of tasks), Code by Zapier, SharePoint
Growth: 5K → 20K → 50K in 18 months, expanding to Benelux + Scandinavia
Funding: €1.6M (Oct 2025), Trind VC + GIMIC
Insight: Single builder running entire marketplace, 100+ cars/month, 4x growth rate
Pain: Loop task consumption (750/month exhausted in few runs), Pipedrive webhook caps
Angle: Enterprise for predictability + multi-builder governance as they scale across Europe
Status: Strategic reply sent (Feb 20) - framed around scaling rev ops engine across business, competitive pressure on AI/automation

FIZBER LEAD - Feb 20, 2026

Contact: Pj Mitchell (COO), pjmitchell@fizber.com
Domain: fizber.com
Plan: Team 400K (monthly), $25,188 ARR
Renewal: Feb 21, 2026 (TOMORROW)
Utilization: 134% (2.6M tasks used, 400K limit)
Users: 6 total, 2 active
Zaps: 173 active, 25M+ lifetime tasks

Multi-brand operation:
- SOLD.com (consumer outbound/aged leads)
- YOURVOICE (agent webinars + CS)
- Fizber (FSBO listings)
- Rental Beast (notifications)
- Facebook Lead Ads, BigMarker webinars

Tech stack: Gong, BigMarker, Facebook Lead Ads, Typeform, HubSpot, Twilio, Slack

Insight: Single builder (Pj) running entire multi-brand automation engine. Renewal timing + massive footprint = strategic expansion opportunity beyond task limit upsell.
ZOLLEGE TLU LEAD - Feb 19, 2026

Contact: Kevin Colten (CTO)
LinkedIn: linkedin.com/in/kevincolten
Domain: zollege.com
Plan: Team 50K (monthly), renews Feb 20, 2026
Utilization: 130% (65K+ tasks on 50K limit)
Tech: 25+ apps (ChatGPT, HubSpot, Slack, Stripe, Twilio, etc.)
Insight: 130% utilization + renewal timing = ideal outreach moment
PATOMA BUMP EMAIL - COMPLETE (Feb 21, 2026)

Status: Email drafted and sent - combines Option A (15-min meeting) + Option C (urgency: leasing season timing)

Context: Paul Henry opened $70K proposal multiple times but hasn't responded. Pattern = procrastination due to bandwidth overload, not price objection. Strategy = lower activation energy, create urgency without discounting.

Key hooks:
- 15-min call to walk through (removes reading burden)
- Summer leasing season spike (145K→200K tasks expected) - needs to start in next few weeks for June readiness
- Week 1 deliverables preview (AI Command Center + Financial Reconciliation Bot)

Output: `deals/patoma/outputs/patoma-bump-email.docx`

ZOLLEGE TLU LEAD - Feb 19, 2026

Contact: Kevin Colten (CTO)
LinkedIn: linkedin.com/in/kevincolten
Domain: zollege.com
Plan: Team 50K (monthly), renews Feb 20, 2026
Utilization: 130% (65K+ tasks on 50K limit)
Tech: 25+ apps (ChatGPT, HubSpot, Slack, Stripe, Twilio, etc.)
Insight: 130% utilization + renewal timing = ideal outreach moment
</tmp/zollege-research>
<tool_guidelines description="How to use available tools effectively. Reference when uncertain about tool capabilities or parameters.">
AVAILABLE TOOLS:

1. memory - Manage memory blocks
   Commands:
   - create: New block (path, description, file_text)
   - str_replace: Edit existing (path, old_str, new_str) - for precise edits
   - insert: Add line (path, insert_line, insert_text)
   - delete: Remove block (path)
   - rename: Move/update description (old_path, new_path, or path + description)

   Use str_replace for small edits. Use memory_rethink for major rewrites.

2. memory_rethink - Rewrite entire block
   Parameters: label, new_memory
   Use when: reorganizing, condensing, or major structural changes
   Don't use for: adding a single line, fixing a typo

3. conversation_search - Search ALL past messages (cross-session)
   Parameters: query, limit, roles (filter by user/assistant/tool), start_date, end_date
   Returns: timestamped messages with relevance scores
   IMPORTANT: Searches every message ever sent to this agent across ALL Claude Code sessions
   Use when: detecting patterns across sessions, finding recurring issues, recalling past solutions
   This is powerful for cross-session context that wouldn't be visible in any single transcript

4. web_search - Search the web (Exa-powered)
   Parameters: query, num_results, category, include_domains, exclude_domains, date filters
   Categories: company, research paper, news, pdf, github, tweet, personal site, linkedin, financial report
   Use when: need external information, documentation, current events

5. fetch_webpage - Get page content as markdown
   Parameters: url
   Use when: need full content from a specific URL found via search
</tool_guidelines>
<user_preferences description="Learned coding style, tool preferences, and communication style. Updated from observed corrections and explicit statements.">
(No user preferences yet. Populated as sessions reveal coding style, tool choices, and communication preferences.)
</user_preferences>
<user_preferences/title-update description="Title update to AI Transformation Consultant">
**Title Update (Feb 19, 2026):**
- New title: AI Transformation Consultant
- Use in all outreach emails and professional communications
</user_preferences/title-update>
<zapier-roi-calculator description="Zapier ROI Calculator project - hosted at zapier-roi-calculator.vercel.app, used for deal proposals">
Zapier ROI Calculator Project:
- Location: /Users/adrianobleton/zapier-roi-calculator
- Production: zapier-roi-calculator.vercel.app
- Purpose: Calculate and present ROI for Zapier automation proposals
- API: /api/calculations/{shortId}/full, /use-cases, /value-items

Calculation Structure:
- assumptions: hourlyRates (basic=25, engineering=100, executive=200, operations=50), taskMinutes (complex=120, medium=30, simple=5)
- valueItems: category (time_savings, revenue_impact, cost_reduction, uptime), quantity, unitValue, rateTier
- useCases: department, difficulty, status (identified, in_progress, completed, future)

Recent Calculations:
- Patoma (96g9k2): $70K proposed spend, ~$300K annual value, 19 value items, 8 use cases

Value Categories:
- time_savings: quantity × unitValue × hourlyRate × 12
- revenue_impact: quantity × unitValue × rate
- cost_reduction: quantity × unitValue × rate
- uptime: quantity × unitValue × rate

Usage Pattern:
- User creates ROI calculators for deals
- Updates value items and use cases via API to match proposal narrative
- Shares calculator links with prospects to prove value
- Calculator math sometimes differs from local calculations - always verify actual totals via API

FIXED: Add use case button now works (Feb 16, 2026)
- Root cause: Convex `create` mutation required at least one metric or value item, but frontend wasn't passing either
- Fix: Frontend (`UseCasesTab.tsx`) now auto-links first unlinked value item, or creates placeholder "New Metric" if none available
- Guardrail validation kept intact (backend unchanged)
- Committed: c3e236e - "Fix Add Use Case button by auto-linking first available value item"
- Deployed to production: https://zapier-roi-calculator.vercel.app/c/78cgg4
</zapier-roi-calculator>
</letta_memory_blocks>
</letta>
