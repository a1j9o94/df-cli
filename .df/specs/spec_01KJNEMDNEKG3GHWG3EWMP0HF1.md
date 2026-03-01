---
id: spec_01KJNEMDNEKG3GHWG3EWMP0HF1
title: Require holdout scenarios before build phase starts — even with skip-architect
type: feature
status: draft
version: 0.1.0
priority: high
---

# Require holdout scenarios before build phase starts

## Goal

Builders should never start without holdout scenarios to validate against. Without scenarios, the evaluator has nothing to test, and the pipeline's core value proposition — empirical validation, not vibes — is hollow.

Currently `--skip-architect` skips scenario creation entirely. And even without `--skip-architect`, if the architect fails to create scenarios (e.g. the completion guard rejects it), the pipeline could fall through to build with empty `.df/scenarios/`.

The build phase must refuse to start unless at least one holdout scenario exists.

## Current State

- The architect completion guard requires scenarios (added in this session)
- But `--skip-architect` bypasses the architect entirely — no guard fires
- The engine's `executeBuildPhase` never checks for scenarios
- The evaluator receives empty scenario lists and auto-passes

## Requirements

### Pre-build gate in the engine (`src/pipeline/engine.ts`)

Before entering the build phase, check that `.df/scenarios/functional/` contains at least one `.md` file. If not:

1. If `--skip-architect` was used, the engine should create scenarios from the spec automatically:
   - Parse the spec's `## Scenarios` section
   - Write each scenario as a `.md` file in `.df/scenarios/functional/` or `.df/scenarios/change/`
   - Log what was created
   - This is a lightweight extraction, not an architect agent — just frontmatter + content parsing

2. If the architect ran but created no scenarios (guard should prevent this, but defense in depth):
   - Fail the pipeline with a clear error: "No holdout scenarios found. The architect must create scenarios before build can start."

### Spec scenario extraction (`src/pipeline/scenarios.ts`)

New module that extracts scenarios from a spec's markdown:
- Parse the `## Scenarios` section
- Find `### Functional` and `### Changeability` subsections
- Each numbered item becomes a scenario file
- Write to `.df/scenarios/functional/<name>.md` or `.df/scenarios/change/<name>.md`
- Return count of scenarios created

### Update `--skip-architect` documentation

All help text and README should clarify that `--skip-architect` still creates holdout scenarios from the spec — it only skips the decomposition/buildplan step.

### Evaluator must have scenarios to evaluate

Update the evaluator's completion guard: if `dark scenario list` returns 0 scenarios, the evaluator should fail with "No scenarios to evaluate" rather than auto-passing with score 1.0.

## Contracts

- `extractScenariosFromSpec(specFilePath, outputDir): number` — returns count of scenarios extracted
- Pre-build gate: `ensureScenariosExist(dfDir): void` — throws if no scenarios found

## Scenarios

### Functional

1. **Skip-architect creates scenarios**: Run `dark build --skip-architect` on a spec with 4 functional scenarios defined. Verify `.df/scenarios/functional/` has 4 files before builders start.

2. **Build blocked without scenarios**: Delete all files from `.df/scenarios/`. Run `dark build` (no skip). Verify architect is forced to create scenarios (existing guard). Then delete scenarios after architect and before build — verify build phase refuses to start.

3. **Evaluator rejects empty scenarios**: Manually clear scenarios. Spawn an evaluator. Verify it fails with "No scenarios to evaluate" instead of passing with 1.0.

4. **Spec with no scenarios section**: Run `dark build --skip-architect` on a spec that has no `## Scenarios` section. Verify pipeline fails with a clear error telling the user to add scenarios to the spec.

5. **Extracted scenarios match spec**: Create a spec with specific scenario names and descriptions. Run extraction. Verify filenames and content match the spec.

### Changeability

1. **Add scenario type**: Adding a new scenario type (e.g. "performance") should require adding it to the extraction parser and the scenario directory structure — no engine changes needed.
