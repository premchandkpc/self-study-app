# Vercel Deployment Guide

This project is configured for deployment to Vercel.

## Prerequisites

- Vercel account (create at https://vercel.com)
- GitHub account with this repo connected

## Deployment Steps

### 1. Connect to Vercel

- Go to https://vercel.com/dashboard
- Click "Add New..." → "Project"
- Import your GitHub repository
- Vercel will auto-detect the Vite + React framework

### 2. Set Environment Variables

In Vercel dashboard, go to your project → Settings → Environment Variables and add:

```
VITE_API_URL=https://your-api-domain.com
```

If using a backend API, set the production API URL here.

### 3. Deploy

Once configured, deployments happen automatically on:
- Push to main branch
- Pull requests (preview deployments)

Or manually deploy with:
```bash
npm install -g vercel
vercel
```

## Configuration Files

- `vercel.json` - Vercel build configuration
- `.vercelignore` - Files to exclude from deployment

## Build Details

- **Build Command**: `npm run build:web`
- **Output Directory**: `packages/web/dist`
- **Framework**: Vite (React)

## Notes

- Static site deployment (no backend required on Vercel)
- API calls proxy to backend via VITE_API_URL env var
- Builds happen in the monorepo context
