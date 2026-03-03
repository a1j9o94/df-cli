---
name: swap-editor-implementation
type: change
spec_id: run_01KJT1DSG8KTH91RNPN25VTA7Q
created_by: agt_01KJT1DSG9535H9MNFRT5150J0
---

Changeability test: Replacing the textarea-based editor with a richer editor (e.g., CodeMirror).

MODIFICATION DESCRIPTION:
Replace the basic <textarea> markdown editor with CodeMirror or similar rich editor library. The editor should still provide raw markdown editing with syntax highlighting, but through a more capable widget.

EXPECTED CHANGE SCOPE:
1. Replace the textarea HTML element with the CodeMirror initialization code
   - This should be confined to the editor component/section in the dashboard UI (index.ts)
2. Update the JS that reads/writes editor content
   - Instead of textarea.value, use the editor API (e.g., editor.getValue(), editor.setValue())
3. Add CodeMirror script/CSS include (CDN link or inline)

AREAS THAT SHOULD NOT CHANGE:
- The save/load API contract (PUT /api/specs/:id body format stays the same)
- The auto-save debounce logic (just hooks into editor change events instead of textarea input events)
- The spec creation flow
- The build trigger mechanism
- The immutability guard (just uses editor.setOption('readOnly', true) instead of textarea.disabled)
- Server-side code (no changes to server.ts or API handlers)

EXPECTED EFFORT:
- Editor widget swap: ~30-50 lines changed in the editor section of index.ts
- Event handler updates: ~10-15 lines
- CDN include: ~2-3 lines in the <head>
- Total: <70 lines of changes in 1 file (index.ts)

PASS CRITERIA:
- Can be implemented by modifying only the editor component in index.ts
- No changes to server.ts or any API handler
- Save/load API contract unchanged (still sends/receives raw markdown strings)
- Auto-save still works with the new editor
- Immutability guard still works (editor becomes read-only for completed specs)