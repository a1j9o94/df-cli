---
name: spinners-clear-on-success-and-error
type: functional
spec_id: run_01KJRQYQMGFJ5J31M5F5CCD6KM
created_by: agt_01KJRQYQMH3ZCH0EQ5168F1SV9
---

Test: Loading spinners are replaced by actual content on successful data load, and replaced by error messages on fetch failure.
Setup: Call generateDashboardHtml() to get the HTML string.
Steps:
1. In loadAgents JS: verify spinner innerHTML is set BEFORE fetchJson
2. In loadAgents JS: verify renderAgents(agents) is called on success, which replaces container.innerHTML (clearing spinner)
3. In loadAgents JS: verify the catch block sets container.innerHTML to an error-text div (clearing spinner)
4. In loadModules JS: verify spinner innerHTML is set BEFORE fetchJson
5. In loadModules JS: verify renderModules(modules) is called on success, which replaces container.innerHTML
6. In loadModules JS: verify the catch block sets container.innerHTML to an error-text div
7. Verify renderAgents sets innerHTML even for empty array (shows 'No agents')
8. Verify renderModules sets innerHTML even for empty array (shows 'No modules')
Expected output: Spinners never persist after data load completes or errors.
Pass criteria: Both panels set spinner before fetch; both panels replace innerHTML on success via render functions; both panels replace innerHTML on error via catch blocks; empty arrays show placeholder text.