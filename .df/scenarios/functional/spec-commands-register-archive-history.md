---
name: spec-commands-register-archive-history
type: functional
spec_id: run_01KJSRR01K5PXP0JVNMG3RYM19
created_by: agt_01KJSW378W7038EF5CSNA1WSMC
---

Steps: 1) Run 'dark spec --help'. 2) Verify output lists 'archive' as a subcommand. 3) Verify output lists 'history' as a subcommand. 4) Run 'dark spec archive --help' and 'dark spec history --help' to confirm they are callable. Expected: Both archive and history subcommands are registered and accessible via CLI. Pass criteria: Both commands appear in help and accept arguments without 'unknown command' errors.