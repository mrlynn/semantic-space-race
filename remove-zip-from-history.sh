#!/bin/bash

# Script to remove zip files from git history
# This will rewrite git history - use with caution!

echo "🔍 Removing zip files from git history..."

cd "$(dirname "$0")"

# Remove zip files from all commits
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch 'public/assets/*.zip' 'public/assets/*.ZIP'" \
  --prune-empty --tag-name-filter cat -- --all

# Clean up backup refs
git for-each-ref --format="%(refname)" refs/original/ | xargs -n 1 git update-ref -d

# Force garbage collection
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo "✅ Done! Zip files removed from history."
echo ""
echo "⚠️  WARNING: You'll need to force push to update the remote:"
echo "   git push origin --force --all"
echo ""
echo "⚠️  Make sure all team members are aware before force pushing!"
