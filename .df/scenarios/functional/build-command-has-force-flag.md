---
name: build-command-has-force-flag
type: functional
spec_id: run_01KJSRR01K5PXP0JVNMG3RYM19
created_by: agt_01KJSW378W7038EF5CSNA1WSMC
---

Steps: 1) Run 'dark build --help'. 2) Verify output includes '--force' option. 3) Verify the --force option description mentions bypassing content hash check. Expected: The --force flag is registered in the build command's option definitions. Pass criteria: --force appears in help output and is functional.