---
id: spec_01KJNT36W1185G5KPW63YAGWBR
title: "Spec immutability: enforce new-spec-per-change workflow"
type: feature
status: draft
version: 0.1.0
priority: high
---

# Spec Immutability

## Goal

Once a spec has a completed (or in-progress) build, it should be treated as immutable. If you want to change what you're building, create a new spec. This preserves work history — every run traces back to the exact spec that produced it, and you can always see the progression of ideas across specs.

## Problem

Nothing prevents editing a spec file after it's been built. This breaks the audit trail: a completed run points to a spec, but the spec on disk no longer matches what was actually built. It also tempts users (and parent Claude Code sessions) into modifying-and-rebuilding instead of creating a clean new spec, which loses the "why did we change this?" history.

## Requirements

### Guard 1: `dark build` refuses completed/archived specs
- If `spec.status === "completed"` or `"archived"`, `dark build` should reject with:
  ```
  Spec spec_01ABC is already completed. To build something new, create a new spec:
    dark spec create "Follow-up: <description>"
  ```
- Suggest creating a follow-up spec that references the original

### Guard 2: Content hash check on build
- `dark build` compares the spec file's current content hash against `specs.content_hash` in the DB
- If the file changed since the last run started, warn:
  ```
  Warning: spec file has been modified since the last build.
  The original spec produced run_01XYZ. If this is intentional, use:
    dark spec create "Updated: <title>"
  To build against the modified spec as a NEW spec, or:
    dark build --force
  ```
- `--force` bypasses the check (escape hatch for early drafts)

### Guard 3: Status transitions
- `dark build` advances spec status: `draft → building`
- On pipeline completion: `building → completed`
- On pipeline failure: `building → draft` (can retry)
- `dark spec archive <id>` — manually archive a spec
- Invalid transitions are rejected (can't go from `completed` back to `draft`)

### Guard 4: Spec lineage
- Add optional `parent_spec_id` field to spec frontmatter
- `dark spec create --from <spec-id> "Follow-up: ..."` — creates a new spec with the parent reference and copies the original spec's content as a starting point
- `dark spec history <id>` — show the chain of specs (parent → child → grandchild)
- This makes the evolution visible: "We started with auth spec A, refined to B, then C"

## Scenarios

### Functional

1. **Build refuses completed spec**: Complete a build. Try `dark build <same-spec-id>` again. Verify it's rejected with a helpful message suggesting `dark spec create`.

2. **Content hash mismatch warning**: Start a build, let it complete. Edit the spec file. Try `dark build <spec-id>`. Verify it warns about the content change and suggests creating a new spec.

3. **Force flag bypasses**: Edit a draft spec. `dark build <spec-id> --force` should work without warning.

4. **Spec lineage**: Create spec A, build it. `dark spec create --from <A> "Follow-up"`. Verify the new spec has `parent_spec_id: <A>` and contains A's content. `dark spec history <new-id>` shows A → new.

5. **Status transitions**: Verify `draft → building` on build start, `building → completed` on success, `building → draft` on failure. Verify `completed → draft` is rejected.

6. **Archive**: `dark spec archive <id>` sets status to archived. `dark build <archived-id>` is rejected.

### Changeability

1. **Add spec tagging**: Adding tags/labels to specs (e.g. `--tag auth --tag v2`) should only require a new frontmatter field and a filter flag on `dark spec list`. No changes to the immutability guards.
