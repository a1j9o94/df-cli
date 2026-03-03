---
name: content-hash-algorithm-swappable
type: change
spec_id: run_01KJSRR01K5PXP0JVNMG3RYM19
created_by: agt_01KJT3FJ21XE3DSRTB8EDM5P27
---

Changeability test: Changing the content hash algorithm (SHA-256 to SHA-384 or BLAKE3) should require modifying exactly ONE function - computeContentHash() in build-guards.ts. VERIFICATION: 1. computeContentHash() uses createHash('sha256') from node:crypto. 2. Changing to sha384: modify the hash algorithm string in computeContentHash(). 3. No other function compares or generates hashes elsewhere. 4. The hash is stored as a generic string in specs.content_hash - no length validation. PASS CRITERIA: Hash algorithm change is 1 line in 1 function. No schema changes, no spec type changes, no pipeline changes. FAIL CRITERIA: Hash generation or comparison logic exists in multiple files.