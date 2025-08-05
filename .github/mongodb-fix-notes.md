# MongoDB CI Fix Applied

This commit triggers a fresh CI run with the MongoDB stalling fix:
- Removed duplicate MongoDB service from GitHub Actions
- Tests now use only in-memory MongoDB (mongodb-memory-server)
- No more connection conflicts or stalling issues

The fix should resolve the duplicate MongoDB test entries.
