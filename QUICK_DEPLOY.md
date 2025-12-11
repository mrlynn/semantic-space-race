# Quick Deployment Steps

## 1. Initialize Git Repository (if needed)

```bash
cd /Users/michael.lynn/code/mongodb/games/space/new
git init
git add .
git commit -m "Initial commit: Semantic Hop game"
```

## 2. Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `semantic-hop` (or your choice)
3. **Don't** initialize with README, .gitignore, or license
4. Click "Create repository"

## 3. Push to GitHub

```bash
# Replace YOUR_USERNAME with your GitHub username
git remote add origin https://github.com/YOUR_USERNAME/semantic-hop.git
git branch -M main
git push -u origin main
```

## 4. Deploy to Vercel

1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Add environment variables (see below)
5. Click "Deploy"

## 5. Environment Variables in Vercel

Add these in Vercel → Settings → Environment Variables:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
OPENAI_API_KEY=sk-...
PUSHER_APP_ID=...
PUSHER_KEY=...
PUSHER_SECRET=...
PUSHER_CLUSTER=us2
```

**Important:** Add them for Production, Preview, AND Development environments.

## 6. Done!

Your app will be live at `https://your-project.vercel.app`

Every push to `main` will auto-deploy! 🚀
