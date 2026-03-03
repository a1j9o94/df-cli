---
name: url-detection-duplicated-across-two-modules
type: change
spec_id: run_01KJT1F6B8P7286PNQFFEBC6YK
created_by: agt_01KJT5YPKE616DB9XQV0Q338Y0
---

CHANGEABILITY SCENARIO: URL detection logic for YouTube/Loom URLs is duplicated in two separate modules with divergent regex patterns. (1) src/commands/research/video-detect.ts exports detectVideoUrls() — used by src/pipeline/instructions.ts. Regex: /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=[\w-]+|youtu\.be\/[\w-]+|loom\.com\/share\/[\w-]+)/g. (2) src/utils/url-detection.ts exports extractVideoUrls() — used by src/agents/prompts/architect.ts. Regex: /https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?[^\s)]+|embed\/[^\s)]+)|youtu\.be\/[^\s)]+|loom\.com\/share\/[^\s)]+)/g. The utils version supports embed URLs; the video-detect version does not. These should be a single source of truth. PASS: Both modules import from the same URL detection function (single source of truth). FAIL: Two separate regex patterns exist for URL detection, and a URL format change requires updating two files.