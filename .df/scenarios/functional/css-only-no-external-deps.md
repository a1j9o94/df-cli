---
name: css-only-no-external-deps
type: functional
spec_id: run_01KJRQYQMGFJ5J31M5F5CCD6KM
created_by: agt_01KJRQYQMH3ZCH0EQ5168F1SV9
---

Test: All loading animations use CSS-only techniques with no external dependencies.
Setup: Call generateDashboardHtml() to get the HTML string.
Steps:
1. Verify @keyframes spin is defined (for loading spinner rotation)
2. Verify @keyframes pulse is defined (for status indicator pulsing)
3. Verify NO requestAnimationFrame calls are used for loading indicators
4. Verify NO external assets (.gif, .svg, .png) are referenced for spinners
5. Verify NO external stylesheet links (link rel=stylesheet href=http...) exist
6. Verify NO external script tags (script src=http...) exist
7. Verify the spinner uses CSS border trick (border + border-top-color + border-radius: 50%) not an image
Expected output: Self-contained HTML with inline CSS animations only.
Pass criteria: @keyframes spin and @keyframes pulse defined; no requestAnimationFrame; no external spinner assets; no external CSS/JS imports; spinner uses CSS border technique.