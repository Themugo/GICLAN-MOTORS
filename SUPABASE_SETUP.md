# Supabase Setup Guide for KAYAD

> ⚠️ **This is part of a larger integration guide.** For all services, see: [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)

## Quick Reference

- **Dashboard**: https://supabase.com/dashboard
- **Docs**: https://supabase.com/docs
- **Signup**: https://supabase.com

---

## Step 1: Create a Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Configure your project:
   - **Organization**: Choose your organization or create one
   - **Name**: `kayad`
   - **Database Password**: Generate a strong random password (save this!)
   - **Region**: Select closest to your users (e.g., `EU West` for Kenya)

4. Click **Create new project**
5. Wait 2-3 minutes for provisioning

---

## Step 2: Get API Credentials

Once your project is ready:

1. Go to **Settings** → **API**
2. Find and copy these values:

### Backend Credentials (for `backend/.env`)
```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...  ← service_role secret
SUPABASE_BUCKET=kayad-images
```

### Frontend Credentials (for `.env`)
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...  ← anon public key
```

**Important**: Use the **service_role** secret for backend (has admin privileges). This secret should NEVER be exposed to frontend.

---

## Step 3: Create Storage Bucket

1. In Supabase dashboard, click **Storage** in the left sidebar
2. Click **New Bucket**
3. Configure the bucket:
   ```
   Name: kayad-images
   Public bucket: ✅ CHECK THIS (required for image serving)
   ```
4. Click **Create bucket**

### Optional: Set Storage Policies

If you need fine-grained access control, you can create policies. For public read access:

1. Select the `kayad-images` bucket
2. Go to **Policies** tab
3. Create a policy for public read access:

```sql
-- Allow public read access
CREATE POLICY "Public Read Access" ON storage.objects
FOR SELECT USING (bucket_id = 'kayad-images');

-- Allow authenticated uploads
CREATE POLICY "Authenticated Uploads" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'kayad-images' AND
  auth.role() = 'authenticated'
);
```

---

## Step 4: Configure Environment Variables

### Backend (`backend/.env`)

```env
# Copy from Supabase Dashboard → Settings → API
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...  # service_role secret
SUPABASE_BUCKET=kayad-images
```

### Frontend (`.env`)

```env
# Copy from Supabase Dashboard → Settings → API → Project URL
VITE_SUPABASE_URL=https://xxxxx.supabase.co

# Copy from Supabase Dashboard → Settings → API → anon public key
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

---

## Step 5: Verify Configuration

### Test Backend Storage Connection

```bash
cd backend
npm run dev
```

You should see: `✅ Supabase storage initialized`

### Test Frontend Connection

```bash
npm run dev
```

Check browser console for any Supabase connection errors.

---

## Troubleshooting

### Error: "Storage not configured"

- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set correctly
- Ensure there are no extra spaces or quotes in `.env` values

### Error: "Bucket not found"

- Create the `kayad-images` bucket in Supabase Storage
- Verify the bucket name matches exactly (case-sensitive)

### Error: "Access denied"

- Make sure the bucket is set to **Public**
- Check storage policies if you created custom ones

### Images not loading

- Verify bucket is public: Storage → Select bucket → Check "Public bucket"
- Check CORS settings if accessing from custom domain

---

## Next Steps

After setting up Supabase:

1. **Images** will now upload to Supabase Storage instead of Cloudinary
2. **Auth** uses Supabase Auth (already configured in frontend)
3. **Database** can also use Supabase Postgres (optional migration)

---

## Costs

Supabase Free Tier includes:
- 500MB database
- 1GB file storage
- 50K monthly active users

For most small-to-medium projects, this is sufficient.
