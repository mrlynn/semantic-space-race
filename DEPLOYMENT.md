# Deployment Guide

This guide will help you deploy Semantic Hop to GitHub and Vercel.

## Prerequisites

- GitHub account
- Vercel account (free tier works)
- MongoDB Atlas account
- OpenAI API key
- Pusher account

## Step 1: Prepare the Repository

### 1.1 Initialize Git (if not already done)

```bash
cd /Users/michael.lynn/code/mongodb/games/space/new
git init
```

### 1.2 Add and Commit Files

```bash
# Add all project files
git add .

# Commit
git commit -m "Initial commit: Semantic Hop game"
```

### 1.3 Create GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Create a new repository (e.g., `semantic-hop`)
3. **DO NOT** initialize with README, .gitignore, or license (we already have these)

### 1.4 Push to GitHub

```bash
# Add remote (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 2: Configure Environment Variables

### 2.1 Required Environment Variables

You'll need to set these in Vercel:

- `MONGODB_URI` - MongoDB Atlas connection string
- `OPENAI_API_KEY` - OpenAI API key
- `PUSHER_APP_ID` - Pusher app ID
- `PUSHER_KEY` - Pusher key
- `PUSHER_SECRET` - Pusher secret
- `PUSHER_CLUSTER` - Pusher cluster (e.g., "us2")

### 2.2 Get Your Values

**MongoDB Atlas:**
1. Go to MongoDB Atlas dashboard
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your actual password

**OpenAI:**
1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new secret key
3. Copy it (you won't see it again!)

**Pusher:**
1. Go to [Pusher Dashboard](https://dashboard.pusher.com/)
2. Select your app
3. Go to "App Keys" tab
4. Copy App ID, Key, Secret, and Cluster

## Step 3: Deploy to Vercel

### 3.1 Import Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js settings

### 3.2 Configure Build Settings

Vercel should auto-detect:
- **Framework Preset:** Next.js
- **Root Directory:** `./` (or leave blank)
- **Build Command:** `npm run build` (auto-detected)
- **Output Directory:** `.next` (auto-detected)
- **Install Command:** `npm install` (auto-detected)

### 3.3 Add Environment Variables

In the Vercel project settings:

1. Go to **Settings** → **Environment Variables**
2. Add each variable:
   - `MONGODB_URI` → Your MongoDB connection string
   - `OPENAI_API_KEY` → Your OpenAI API key
   - `PUSHER_APP_ID` → Your Pusher app ID
   - `PUSHER_KEY` → Your Pusher key
   - `PUSHER_SECRET` → Your Pusher secret
   - `PUSHER_CLUSTER` → Your Pusher cluster

3. Make sure to add them for **Production**, **Preview**, and **Development** environments

### 3.4 Deploy

1. Click **Deploy**
2. Wait for build to complete
3. Your app will be live at `https://your-project.vercel.app`

## Step 4: Post-Deployment Setup

### 4.1 Verify MongoDB Connection

1. Make sure your MongoDB Atlas cluster allows connections from anywhere (or add Vercel IPs)
2. In MongoDB Atlas: **Network Access** → Add IP Address → `0.0.0.0/0` (for testing)

### 4.2 Verify Vector Search Index

Make sure your MongoDB collection has a vector search index:
- Index Name: `vector_index`
- Field: `embedding`
- Dimensions: `1536`
- Similarity: `cosine`

### 4.3 Test the Deployment

1. Visit your Vercel URL
2. Create a game
3. Test word navigation
4. Check browser console for errors

## Step 5: Custom Domain (Optional)

1. In Vercel: **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions

## Troubleshooting

### Build Fails

- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Check for TypeScript errors (if using TS)

### Environment Variables Not Working

- Make sure variables are set for the correct environment
- Redeploy after adding new variables
- Check variable names match exactly (case-sensitive)

### MongoDB Connection Issues

- Verify connection string is correct
- Check MongoDB Atlas network access settings
- Ensure database user has proper permissions

### Pusher Connection Issues

- Verify Pusher credentials are correct
- Check Pusher app is enabled
- Verify cluster name matches

## Continuous Deployment

Once set up, every push to `main` branch will automatically deploy to production!

```bash
# Make changes
git add .
git commit -m "Your changes"
git push origin main
# Vercel will automatically deploy
```

## Useful Commands

```bash
# Check deployment status
vercel ls

# View logs
vercel logs

# Open project in Vercel dashboard
vercel open
```
