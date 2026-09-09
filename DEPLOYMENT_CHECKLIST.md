# Deployment Checklist - Attachment Feature

## Pre-Deployment Checklist

- [ ] All code changes committed
- [ ] `@vercel/blob` package installed
- [ ] Prisma schema updated with Attachment models
- [ ] API routes tested locally
- [ ] UI components integrated

## Deployment Steps

### Step 1: Set Up Vercel Blob Storage

1. **Go to Vercel Dashboard**
   - Navigate to: https://vercel.com/dashboard
   - Select your project

2. **Enable Blob Storage**
   - Go to Storage tab
   - Click "Create Database" → "Blob"
   - Name it (e.g., "pck-ledger-attachments")
   - Select your region
   - Click "Create"

3. **Copy Environment Variable**
   - After creation, you'll see `BLOB_READ_WRITE_TOKEN`
   - Copy the token value

4. **Add to Environment Variables**
   - Go to Settings → Environment Variables
   - Add new variable:
     - Name: `BLOB_READ_WRITE_TOKEN`
     - Value: `vercel_blob_rw_xxxxxxxxxxxxx`
     - Environments: Production, Preview, Development
   - Click "Save"

### Step 2: Apply Database Migration

**Option A: Using Vercel Postgres (Recommended)**
```bash
# Run migration on production database
npx prisma migrate deploy
```

**Option B: Direct SQL**
If you prefer manual control:
1. Connect to your PostgreSQL database
2. Run the SQL from `prisma/migrations/add_attachment_models.sql`

### Step 3: Generate Prisma Client

```bash
# Regenerate Prisma client with new models
npx prisma generate
```

### Step 4: Deploy to Vercel

**Via Git (Recommended):**
```bash
git add .
git commit -m "feat: add attachment support with Vercel Blob storage"
git push origin main
```

Vercel will automatically deploy your changes.

**Via Vercel CLI:**
```bash
vercel --prod
```

### Step 5: Verify Deployment

1. **Check Build Logs**
   - Go to Vercel Dashboard → Deployments
   - Click on latest deployment
   - Verify no build errors

2. **Test Attachment Upload**
   - Log in as ADMIN
   - Create or edit a transaction
   - Try uploading an image
   - Verify it appears in the list

3. **Test Attachment Download**
   - Click on uploaded attachment
   - Verify it opens in new tab
   - Check image loads correctly

4. **Test Attachment Delete**
   - Click delete button on an attachment
   - Confirm deletion
   - Verify it's removed from list

5. **Test Purchase Order Attachments**
   - Go to Purchase Orders page
   - Click "Attachments" button
   - Upload and verify

6. **Test Invoice Attachments**
   - Go to Invoices page
   - Click "Attachments" button
   - Upload and verify

### Step 6: Test RBAC

1. **Create CLIENT user** (if not exists)
   - Go to user management
   - Create user with role: CLIENT

2. **Test CLIENT access**
   - Log in as CLIENT
   - Try to view attachments (should work)
   - Try to upload attachment (should be blocked)
   - Try to delete attachment (should be hidden)

## Post-Deployment Verification

### Checklist
- [ ] Attachments upload successfully
- [ ] Attachments display in grid view
- [ ] Image previews show correctly
- [ ] PDF files show file icon
- [ ] Download/view works
- [ ] Delete works (ADMIN only)
- [ ] CLIENT users can only view
- [ ] File size validation works (5MB limit)
- [ ] File type validation works
- [ ] Attachments persist after page refresh
- [ ] Mobile responsive design works

## Rollback Plan

If issues occur:

### Quick Rollback
1. Revert Git commit:
   ```bash
   git revert HEAD
   git push origin main
   ```

2. Vercel will auto-deploy previous version

### Database Rollback
If you need to remove the tables:
```sql
DROP TABLE IF EXISTS "Attachment" CASCADE;
DROP TABLE IF EXISTS "POAttachment" CASCADE;
DROP TABLE IF EXISTS "InvoiceAttachment" CASCADE;
```

## Common Issues & Solutions

### Issue: "BLOB_READ_WRITE_TOKEN is not defined"
**Solution:** 
- Check environment variables in Vercel Dashboard
- Ensure token is added to all environments
- Redeploy after adding variables

### Issue: Prisma Client errors
**Solution:**
```bash
npx prisma generate
npm run build
```

### Issue: Migration fails
**Solution:**
- Check database connection
- Run migration manually via SQL
- Verify Prisma schema syntax

### Issue: 403 Forbidden on uploads
**Solution:**
- Verify user is logged in as ADMIN
- Check RBAC implementation
- Verify session is active

## Environment Variables Summary

Required for attachment feature:
```env
# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx

# Database (existing)
DATABASE_URL=postgresql://...

# NextAuth (existing)
NEXTAUTH_SECRET=...
NEXTAUTH_URL=...
```

## Monitoring

After deployment, monitor:

1. **Vercel Blob Usage**
   - Dashboard → Storage → Blob
   - Check bandwidth usage
   - Check storage usage

2. **Error Logs**
   - Dashboard → Deployments → Logs
   - Look for upload errors
   - Monitor API errors

3. **Performance**
   - Page load times
   - Upload speed
   - Image loading speed

## Costs

### Vercel Blob
- **Hobby**: Free (100GB bandwidth/month)
- **Pro**: $20/month (1TB bandwidth, then $0.15/GB)

### Expected Usage
For typical use:
- 50 attachments/month × 500KB = 25MB storage
- 500 views/month × 500KB = 250MB bandwidth
- **Well within free tier**

## Support Resources

- [Vercel Blob Documentation](https://vercel.com/docs/storage/vercel-blob)
- [Prisma Migration Guide](https://www.prisma.io/docs/guides/migrate)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

## Success Criteria

✅ All API endpoints return 200 OK
✅ Attachments upload without errors
✅ Images display correctly
✅ RBAC enforced properly
✅ No console errors
✅ Mobile responsive
✅ Performance acceptable (<3s page load)

---

**Deployment Date:** _______________
**Deployed By:** _______________
**Verified By:** _______________
