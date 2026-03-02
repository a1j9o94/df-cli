---
id: spec_01KJNRXW0DEZCSCBNWJ4GDTX9N
title: "Design artifact pipeline: pass mockups, screenshots, and visual references through the build pipeline"
type: feature
status: draft
version: 0.1.0
priority: medium
depends_on:
  - spec_01KJNRY4XMXMHZN67NWWYWRTXH
---

# Design Artifact Pipeline

## Goal

Allow users to attach visual references (mockups, wireframes, screenshots, design system tokens) to specs so that builder agents can reference them during implementation and evaluator agents can compare the built output against the original design intent.

## Problem

Today specs are markdown-only. When a PM drops a Figma screenshot or a hand-drawn wireframe, there's no way to get it into the pipeline. Builders work blind — they implement based on text descriptions and hope it looks right. Evaluators have no visual ground truth to compare against.

Claude Code is multimodal — it can read images natively. The infrastructure just needs to get the right images to the right agents at the right time.

## Requirements

### Module 1: Spec Attachments (`src/commands/spec/attach.ts`)
- `dark spec attach <spec-id> <file-path>` — copies file into `.df/specs/attachments/<spec-id>/`
- Supported formats: PNG, JPG, SVG, PDF, WEBP
- Updates spec frontmatter with `attachments: ["filename.png", ...]`
- `dark spec attach <spec-id> --url <url>` — downloads and attaches from URL
- `dark spec attachments <spec-id>` — lists attached files with sizes
- File size limit: 10MB per attachment, configurable in config.yaml

### Module 2: Builder Access to Attachments
- When sending instructions to builders, include attachment paths in the mail body
- The builder prompt tells the agent to Read attachment files for visual context
- For worktree-isolated builders: copy attachments into the worktree's `.df-attachments/` directory so they're accessible
- Attachments are read-only for builders — they reference but don't modify

### Module 3: Evaluator Visual Comparison
- The evaluator prompt includes attachment paths and instructions to compare visually
- `dark eval screenshot <url> --output <path>` — capture a screenshot of a running app (uses Playwright MCP or headless browser)
- The evaluator can:
  1. Read the mockup attachment
  2. Start the built application
  3. Screenshot the running app
  4. Compare mockup vs screenshot and score visual fidelity
- Visual comparison scoring:
  - Layout match (element positioning, spacing)
  - Color match (palette, contrast)
  - Typography (font sizes, hierarchy)
  - Responsiveness (if mockups show multiple breakpoints)

### Module 4: Design Token Integration
- Support `.json` or `.yaml` design token files as attachments
- Builder prompt includes design tokens so agents use correct colors, spacing, fonts
- Evaluator validates that built CSS/styles reference the correct token values
- Common token formats: Style Dictionary, Figma Tokens, Tailwind config

## Contracts

- `SpecAttachment`: `{ filename: string, path: string, mimeType: string, sizeBytes: number }`
- `AttachmentAccess`: builders get read-only copies, evaluators get originals + screenshot capability
- `VisualScore`: `{ layout: number, color: number, typography: number, overall: number }` (0.0-1.0)

## Scenarios

### Functional

1. **Attach mockup to spec**: Create a spec, attach a PNG mockup. Verify file is copied to `.df/specs/attachments/<spec-id>/`. Verify frontmatter is updated.

2. **Builder receives attachments**: Run a build with an attached mockup. Verify the builder's mail includes the attachment path. Verify the builder can Read the image file from its worktree.

3. **Evaluator visual comparison**: Attach a mockup, build a simple HTML page, run the evaluator. Verify it screenshots the built page and compares against the mockup. Verify it produces a visual fidelity score.

4. **Design tokens in build**: Attach a design tokens JSON file. Verify the builder prompt includes the token values. Verify the builder uses them in generated CSS.

5. **URL attachment**: `dark spec attach <id> --url https://example.com/mockup.png` downloads and stores the file. Verify it's accessible to agents.

### Changeability

1. **Add new attachment type**: Supporting `.sketch` or `.fig` files should only require adding the extension to the allowed list and (optionally) a converter. No pipeline changes needed.
