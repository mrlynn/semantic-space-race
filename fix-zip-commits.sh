#!/bin/bash

# Script to remove zip files from unpushed commits
# This is safer than rewriting all history

cd "$(dirname "$0")"

echo "🔍 Removing zip files from git history..."

# Check if commits are pushed
UNPUSHED=$(git log --oneline origin/main..HEAD 2>/dev/null | wc -l | tr -d ' ')

if [ "$UNPUSHED" -eq "0" ]; then
    echo "⚠️  All commits appear to be pushed. You'll need to use force push."
    echo "   See cleanup-zip-files.md for options."
    exit 1
fi

echo "✅ Found $UNPUSHED unpushed commits. Safe to rewrite."

# Remove zip files from all commits using filter-branch
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch 'public/assets/*.zip' 'public/assets/*.ZIP' 2>/dev/null || true" \
  --prune-empty --tag-name-filter cat -- origin/main..HEAD

# Clean up backup refs
git for-each-ref --format="%(refname)" refs/original/ 2>/dev/null | xargs -n 1 git update-ref -d 2>/dev/null || true

# Force garbage collection
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo "✅ Done! Zip files removed from unpushed commits."
echo ""
echo "📋 Next steps:"
echo "   1. Review changes: git log --oneline"
echo "   2. Commit the .gitignore update: git commit -m 'Remove zip files and update .gitignore'"
echo "   3. Push normally: git push origin main"
echo ""
