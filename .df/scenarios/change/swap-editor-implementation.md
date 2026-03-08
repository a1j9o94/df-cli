---
name: swap-editor-implementation
type: change
spec_id: run_01KK6D0A338WWPKA9YNGG3S1WB
created_by: agt_01KK6D0A34XA7984X9D1YCNN6W
---

CHANGEABILITY SCENARIO: Swap editor implementation
MODIFICATION: Replace the textarea-based markdown editor with a richer editor (e.g., CodeMirror or Monaco) without changing any other components.
AFFECTED AREAS:
- The editor component in index.ts: Replace the <textarea> and preview pane with a CodeMirror instance
- CSS for the editor area may need updating
- No changes needed to: save/load API contract (GET/PUT /api/specs/:id), sidebar component, build button logic, immutability guard logic (just wire disabled state to new editor API), auto-save debounce logic (wire to new editor's change event)
EXPECTED EFFORT: Medium — swap the editor DOM element, update event listeners for content changes, update the getValue/setValue interface. The save mechanism remains the same (grab content string, PUT to API).
PASS CRITERIA: Editor can be swapped by: (1) replacing the editor DOM creation code, (2) updating getContent/setContent calls, (3) updating the change event listener for auto-save. The API layer (PUT /api/specs/:id with markdown body) is completely untouched.