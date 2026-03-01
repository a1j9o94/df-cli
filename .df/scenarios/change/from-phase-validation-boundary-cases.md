---
name: from-phase-validation-boundary-cases
type: change
spec_id: run_01KJN8QXTC1J67B6B9BW3R4M41
created_by: agt_01KJNCFDB4XCTNP384RQ41KS8V
---

CHANGEABILITY SCENARIO: Test --from-phase with edge cases (first phase, last phase, empty string)

DESCRIPTION:
The --from-phase flag should handle boundary cases cleanly. Test with the first phase (scout), the last phase (merge), and an empty string.

MODIFICATION STEPS:
1. No code changes needed — this tests existing behavior
2. Verify dark continue --from-phase scout resumes from the very beginning
3. Verify dark continue --from-phase merge resumes from the final phase
4. Verify dark continue --from-phase '' is handled (empty string)

VERIFICATION:
1. --from-phase scout: should restart pipeline from scratch (no phases skipped)
2. --from-phase merge: should skip all phases except merge
3. --from-phase (empty): should either use default getResumePoint or fail with clear error
4. Engine startIdx calculation handles all PHASE_ORDER indices correctly

PASS CRITERIA:
- First phase (scout) and last phase (merge) both work as fromPhase values
- Empty string does not cause a crash (handled gracefully)
- PHASE_ORDER.indexOf() returns valid index for all valid phase names