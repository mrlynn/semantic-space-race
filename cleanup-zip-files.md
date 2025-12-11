# Removing Zip Files from Git History

You have two zip files in your git history that are preventing pushes:
- `public/assets/MongoDB-selected-assets.zip`
- `public/assets/MongoDB-selected-assets (2).zip`

## Option 1: Quick Fix (If files aren't pushed yet)

If the commits with zip files haven't been pushed to GitHub yet:

```bash
# 1. Stage the removal and .gitignore update
git add .gitignore
git commit -m "Remove zip files and update .gitignore"

# 2. If the zip files are in recent commits, you can amend:
git commit --amend --no-edit

# 3. Push normally
git push origin main
```

## Option 2: Remove from History (Required if already pushed)

Since the files are already in commit `19544b9` which appears to be pushed, you need to rewrite history:

### Using git filter-branch (Built-in):

```bash
# Remove zip files from all commits
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch 'public/assets/*.zip' 'public/assets/*.ZIP'" \
  --prune-empty --tag-name-filter cat -- --all

# Clean up
git for-each-ref --format="%(refname)" refs/original/ | xargs -n 1 git update-ref -d
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (⚠️ WARNING: This rewrites remote history!)
git push origin --force --all
```

### Using BFG Repo-Cleaner (Faster, recommended):

1. Install BFG: `brew install bfg` (or download from https://rtyley.github.io/bfg-repo-cleaner/)

2. Run BFG:
```bash
bfg --delete-files "*.zip" .
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push origin --force --all
```

## Option 3: Use the provided script

I've created `remove-zip-from-history.sh` which automates Option 2:

```bash
./remove-zip-from-history.sh
git push origin --force --all
```

## ⚠️ Important Warnings:

1. **Force pushing rewrites history** - Anyone who has cloned the repo will need to re-clone
2. **Backup first** - Make sure you have a backup or all team members are aware
3. **Coordinate with team** - If others are working on this repo, coordinate the force push

## After cleanup:

The `.gitignore` has been updated to prevent this in the future:
- `*.zip` and `*.ZIP` are now ignored
- `/public/assets/*.zip` is specifically ignored
