---
id: spec_01KJNZABQ4Y3EQX416E1HM0G8V
title: "YouTube video research: integrate llm-youtube for extracting context from video tutorials and talks"
type: feature
status: draft
version: 0.1.0
priority: medium
depends_on:
  - spec_01KJNRY4XMXMHZN67NWWYWRTXH
---

# YouTube Video Research

## Goal

Let architects (and other research-capable agents) extract context from YouTube and Loom videos using the `llm-youtube` CLI tool. When a spec references a tutorial video, a conference talk, or a Loom walkthrough, the architect should be able to pull the transcript, ask questions about it, and save the findings as research artifacts for builders.

## Context

`llm-youtube` is already installed at `/Users/adrianobleton/llm-youtube` and available in PATH. It supports:
- `llm-youtube transcript -v <url>` — raw transcript as text or JSON
- `llm-youtube ask -v <url> "<question>"` — ask Claude about a video (transcript-based)
- `llm-youtube info -v <url>` — metadata (title, duration, chapters)
- `llm-youtube frames -v <url>` — extract visual frames
- `llm-youtube manifest -v <url>` — structured JSON mapping frames to transcript segments

## Requirements

### Module 1: `dark research video` command
- `dark research video <agent-id> <url> [--question "<q>"]` — fetch video transcript, optionally ask a question, save as research artifact
- Without `--question`: saves the full transcript as a research artifact
- With `--question`: runs `llm-youtube ask` and saves the answer + transcript reference
- Supports YouTube URLs and Loom URLs
- Stores output in `.df/research/<run-id>/` as markdown
- Tags to module if `--module <id>` is provided

### Module 2: Architect prompt integration
- Architect prompt mentions `dark research video` as available
- When a spec body contains YouTube/Loom URLs, the architect's mail instructions call them out: "The spec references these videos — use `dark research video` to extract context before decomposing"
- The engine detects URLs in the spec content (simple regex for youtube.com, youtu.be, loom.com) and includes them in the architect's instructions

### Module 3: Builder access
- Builders can read video research via `dark research list --run-id <id> --module <id>`
- Transcript summaries and Q&A answers are available as regular research artifacts
- Builders don't need to call llm-youtube directly — the research is pre-extracted by the architect

## Scenarios

### Functional

1. **Architect extracts video transcript**: Spec references a YouTube tutorial URL. Architect calls `dark research video <id> <url>`. Verify transcript saved in `.df/research/`.

2. **Architect asks question about video**: Architect calls `dark research video <id> <url> --question "What library does this tutorial use for auth?"`. Verify answer saved as research artifact.

3. **Builder reads video research**: Architect extracts video research tagged to a module. Builder queries research for that module. Verify transcript/answer is accessible.

4. **Loom video support**: Spec references a Loom URL. Verify `dark research video` handles it correctly (llm-youtube supports Loom).

5. **URL auto-detection in spec**: Spec body contains a YouTube URL. Verify architect's mail instructions mention the URL and suggest using `dark research video`.

### Changeability

1. **Add podcast support**: If llm-youtube adds podcast support later, `dark research video` should work with podcast URLs without changes — it just passes through to llm-youtube.
