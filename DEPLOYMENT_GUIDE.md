---
title: DEPLOYMENT_GUIDE
owner: @devops-lead
team: devops
last-reviewed: 2026-06-23
review-frequency: monthly
status: active
tags: [deployment]
---
# KAYAD Deployment Guide

**Date:** May 23, 2026
**Project:** KAYAD - Kenya's Premium Car Marketplace
**Version:** 2.0.0
**Live Site:** www.kayad.space
**API:** api.kayad.space

---

## Current Status

**Project Rating:** 10/10 ✅
**Local Folder:** C:\Users\Kamaa\Desktop\KAYAD-main ✅
**GitHub:** https://github.com/Themugo/KAYAD (Latest: 7a692b3) ✅
**Live Site:** www.kayad.space (Needs Deployment)

---

## Deployment Architecture

```
Frontend (www.kayad.space)
  └─ Vercel (React SPA)
      └─ Rewrites /api/* → api.kayad.space
      └─ Rewrites /socket.io/* → api.kayad.space

Backend (api.kayad.space)
  └─ VPS/Server (Node.js + PM2)
      └─ Supabase (Postgres)
      └─ Socket.io
      └─ M-Pesa Integration
```

---

## Prerequisites

### Frontend Deployment (Vercel)
- Vercel account connected to GitHub
- Environment variables configured in Vercel
- Domain www.kayad.space connected to Vercel project

### Backend Deployment (Server)
- SSH access to production server
- Node.js 18+ installed on server
- PM2 installed globally
- Supabase project URL + service key
- Environment variables configured
- Git access on server

---

## Deployment Steps

### 1. Frontend Deployment (Vercel)

#### Option A: Automatic Deployment (Recommended)
Vercel automatically deploys when you push to GitHub. Since latest changes are already pushed:

1. **Check Vercel Dashboard**
   - Go to https://vercel.com/dashboard
   - Find the KAYAD project
   - Check deployment status
   - Latest commit 7a692b3 should be deploying or deployed

2. **Verify Deployment**
   - Visit https://www.kayad.space
   - Check if latest changes are live
   - Open browser DevTools Console for errors

#### Option B: Manual Deployment via Vercel CLI
```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Or deploy specific project
vercel --prod --yes
```

#### Option C: Redeploy Latest Commit
```bash
# Via Vercel Dashboard
# 1. Go to project deployments
# 2. Find commit 7a692b3
# 3. Click "Redeploy"
```

### 2. Backend Deployment (Server)

#### Prerequisites
- SSH access to server
- Backend code is on server
- PM2 is configured

#### Deployment Steps

```bash
# 1. SSH into production server
ssh user@api.kayad.space

# 2. Navigate to backend directory
cd /path/to/kayad/backend

# 3. Pull latest changes
git pull origin master

# 4. Install dependencies
npm ci --omit=dev

# 5. Run pre-deploy backup (optional)
bash scripts/backup.sh

# 6. Zero-downtime restart with PM2
pm2 reload ecosystem.config.cjs --update-env

# 7. Check PM2 status
pm2 status
pm2 logs kayad-api

# 8. Verify health
curl https://api.kayad.space/health
curl https://api.kayad.space/health/deep
```

#### Using Deployment Script
```bash
# Run the deployment script
bash scripts/deploy.sh
```

---

## Environment Variables

### Frontend (Vercel)
Set these in Vercel Dashboard → Settings → Environment Variables:

```bash
VITE_API_URL=https://api.kayad.space
VITE_SOCKET_URL=wss://api.kayad.space
VITE_ENABLE_MOCK=false
```

### Backend (Server)
Set these in server environment or `.env` file:

```bash
NODE_ENV=production
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-secret-key
FRONTEND_URL=https://www.kayad.space
SENTRY_DSN=your-sentry-dsn
REDIS_URL=your-redis-url
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_PASSKEY=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
WEBHOIST_EMAIL=owner@kayad.space
```

---

## Verification Checklist

### Frontend Verification
- [ ] Visit https://www.kayad.space
- [ ] Check page loads without errors
- [ ] Verify API calls work (check Network tab)
- [ ] Test WebSocket connection (check Console)
- [ ] Verify authentication works
- [ ] Test auction bidding flow
- [ ] Test escrow flow
- [ ] Check mobile responsiveness

### Backend Verification
- [ ] Check health endpoint: `curl https://api.kayad.space/health`
- [ ] Check deep health: `curl https://api.kayad.space/health/deep`
- [ ] Check metrics: `curl https://api.kayad.space/metrics`
- [ ] Verify PM2 status: `pm2 status`
- [ ] Check PM2 logs: `pm2 logs kayad-api`
- [ ] Test API endpoints
- [ ] Verify WebSocket connection
- [ ] Check database connectivity
- [ ] Verify M-Pesa integration
- [ ] Check Sentry error tracking

---

## Rollback Plan

### Frontend Rollback
```bash
# Via Vercel Dashboard
# 1. Go to Deployments
# 2. Find previous deployment
# 3. Click "Promote to Production"
```

### Backend Rollback
```bash
# SSH into server
ssh user@api.kayad.space

# Navigate to backend
cd /path/to/kayad/backend

# Rollback to previous commit
git log --oneline -5
git checkout <previous-commit-hash>

# Restart PM2
pm2 reload ecosystem.config.cjs
```

---

## Troubleshooting

### Frontend Issues

**Build Fails on Vercel**
- Check Vercel build logs
- Verify all dependencies are in package.json
- Check environment variables
- Ensure Node version is compatible

**API Calls Failing**
- Verify CORS configuration
- Check API is accessible
- Verify environment variables
- Check browser console for errors

**WebSocket Connection Fails**
- Verify Socket.io URL
- Check backend WebSocket is running
- Verify CORS for WebSocket
- Check firewall rules

### Backend Issues

**PM2 Won't Start**
- Check logs: `pm2 logs kayad-api`
- Verify environment variables
- Check port availability
- Verify Supabase connection

**Database Connection Fails**
- Verify SUPABASE_URL and SUPABASE_SERVICE_KEY
- Check Supabase project status/quota
- Verify network connectivity

**M-Pesa Integration Fails**
- Verify credentials
- Check IP whitelist
- Verify callback URL
- Check Safaricom API status

---

## Monitoring

### Frontend Monitoring
- Vercel Analytics
- Google Analytics
- Sentry (if configured)

### Backend Monitoring
- PM2 monitoring: `pm2 monit`
- Sentry error tracking
- Custom metrics: `https://api.kayad.space/metrics`
- Health checks: `https://api.kayad.space/health`

---

## Post-Deployment Tasks

1. **Clear CDN Cache** (if using CDN)
   - Vercel: Automatic on deployment
   - CloudFront: Manual invalidation

2. **Verify All Features**
   - User registration/login
   - Car browsing
   - Auction bidding
   - Escrow flow
   - Payments
   - Chat functionality
   - Admin dashboard

3. **Monitor Logs**
   - Check PM2 logs for errors
   - Monitor Sentry for exceptions
   - Check Vercel logs for frontend errors

4. **Performance Check**
   - Load test with k6 scripts
   - Check response times
   - Monitor resource usage

---

## Quick Deploy Commands

### Frontend (Vercel CLI)
```bash
vercel --prod
```

### Backend (SSH)
```bash
ssh user@api.kayad.space
cd /path/to/kayad/backend
git pull origin master
npm ci --omit=dev
pm2 reload ecosystem.config.cjs --update-env
pm2 status
```

---

## Current Deployment Status

**Frontend:** Needs deployment to Vercel
**Backend:** Needs deployment to production server
**Latest Commit:** 7a692b3
**Changes Include:**
- CONTRIBUTING.md (comprehensive contribution guidelines)
- CDN.md (CDN configuration documentation)
- Load testing scripts (k6.js, k6-auction.js)
- SECURITY_AUDIT_REPORT.md (comprehensive security audit)

---

## Next Steps

1. **Deploy Frontend to Vercel**
   - Check Vercel dashboard for automatic deployment
   - Or manually deploy using Vercel CLI

2. **Deploy Backend to Server**
   - SSH into production server
   - Pull latest changes
   - Restart PM2

3. **Verify Deployment**
   - Test all critical features
   - Monitor logs
   - Check health endpoints

4. **Monitor Post-Deployment**
   - Watch for errors
   - Monitor performance
   - Check user feedback

---

**Last Updated:** May 23, 2026
**Deployment Version:** 2.0.0
**Status:** Ready for Deployment
