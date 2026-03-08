---
name: github-importer-is-flat-file-not-subdirectory
type: change
spec_id: run_01KK7SEAH0J838RH3SWCBR48SQ
created_by: agt_01KK7XF6W0MA66MHHBCJ5JS3RM
---

VERIFIED FACT: src/importers/github.ts is a FLAT file (not in a subdirectory). There is NO src/importers/github/ subdirectory. github.ts IS actively used - exported and registered in src/importers/index.ts (lines 3, 9, 18). Scenarios claiming github.ts is dead code or that a github/importer.ts exists are WRONG. VERIFICATION: ls src/importers/ shows github.ts as flat file. grep 'GitHubImporter' src/importers/index.ts shows active import and registration. PASS: github.ts is the only GitHub importer file, actively used. FAIL: if github.ts is dead code or a github/ subdirectory exists.