---
name: swap-editor-implementation
type: change
spec_id: run_01KK6BYC9GJ9F5XNE49PW7SN3S
created_by: agt_01KK6BYC9JZPT9DBGBS867HCTJ
---

Modification: Replace the textarea-based markdown editor with a richer editor like CodeMirror or Monaco.

Expected changes:
1. Replace the editor component (textarea + preview) with a CodeMirror/Monaco instance
2. Add necessary script/style includes for the editor library
3. Wire up the new editor's change events to the existing auto-save debounce logic

Areas that should NOT change:
- PUT /api/specs/:id request/response format (still sends markdown string body)
- GET /api/specs/:id response format (still returns markdown string)
- Auto-save timing logic (3-second debounce)
- Save indicator UI
- Immutability guard logic (locked specs remain non-editable regardless of editor)
- Sidebar, creation flow, build flow

Expected effort: Small-medium — swap one UI component. The editor is a self-contained presentation layer; the data contract (markdown string in/out via API) is stable.

Pass criteria: Editor replacement only touches the editor component code. All API contracts, auto-save behavior, and immutability logic remain unchanged.