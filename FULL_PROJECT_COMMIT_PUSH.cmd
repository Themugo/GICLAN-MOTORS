@echo off
setlocal
cd /d C:\Users\hp\Desktop\KAYAD-main

echo === KAYAD FULL PROJECT VERIFICATION ===
npm run normalize:supabase-migrations
if errorlevel 1 exit /b 1
npm run validate:supabase-migrations
if errorlevel 1 exit /b 1
npm run validate:cms-schema
if errorlevel 1 exit /b 1
node --check backend\cms\services\cmsService.js
if errorlevel 1 exit /b 1
git diff --check
if errorlevel 1 exit /b 1
supabase migration list
if errorlevel 1 exit /b 1
supabase db push --dry-run
if errorlevel 1 exit /b 1
npm test -- --run
if errorlevel 1 exit /b 1
npm run lint
if errorlevel 1 exit /b 1
npm run build
if errorlevel 1 exit /b 1

echo === REVIEW GIT DIFF ===
git status --short
git diff --stat

echo.
echo If the review is clean, commit and push:
echo git add -A
echo git diff --cached --check
echo git commit -m "chore: consolidate KAYAD full production project"
echo git push origin main
endlocal
