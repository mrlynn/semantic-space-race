#!/bin/bash

# Script to prepare Semantic Hop for GitHub and Vercel deployment

echo "🚀 Preparing Semantic Hop for deployment..."

# Clean up temporary files
echo "📦 Cleaning up temporary files..."
rm -f app/api/similarity-search/.route.js.swp
rm -f *.swp *.swo *~
rm -rf .next
rm -f .cursor/debug.log

# Check if git is initialized
if [ ! -d .git ]; then
    echo "📝 Initializing git repository..."
    git init
fi

# Add all files
echo "📝 Adding files to git..."
git add .

# Show what will be committed
echo ""
echo "📋 Files to be committed:"
git status --short

echo ""
echo "✅ Ready to commit!"
echo ""
echo "Next steps:"
echo "1. Review the files above"
echo "2. Commit: git commit -m 'Initial commit: Semantic Hop game'"
echo "3. Create GitHub repo and push"
echo "4. Deploy to Vercel"
echo ""
echo "See QUICK_DEPLOY.md for detailed instructions"
