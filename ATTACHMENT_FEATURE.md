# Attachment Feature Implementation

## Overview
This document describes the implementation of image and file attachment support for the PCK Ledger application using Vercel Blob storage.

## Features Implemented

### 1. **Database Schema**
Added three new tables to support attachments:
- `Attachment` - For transaction attachments
- `POAttachment` - For purchase order attachments
- `InvoiceAttachment` - For invoice attachments

Each table stores:
- `url`: Vercel Blob storage URL
- `filename`: Original filename
- `filesize`: File size in bytes
- `mimetype`: MIME type (image/jpeg, image/png, etc.)
- `createdAt`: Upload timestamp

### 2. **API Routes**
Created RESTful API endpoints for all three entity types:

#### Transaction Attachments
- `GET /api/transactions/[id]/attachments` - List all attachments
- `POST /api/transactions/[id]/attachments` - Upload new attachment
- `DELETE /api/transactions/[id]/attachments?attachmentId=xxx` - Delete attachment

#### Purchase Order Attachments
- `GET /api/purchase-orders/[id]/attachments`
- `POST /api/purchase-orders/[id]/attachments`
- `DELETE /api/purchase-orders/[id]/attachments?attachmentId=xxx`

#### Invoice Attachments
- `GET /api/invoices/[id]/attachments`
- `POST /api/invoices/[id]/attachments`
- `DELETE /api/invoices/[id]/attachments?attachmentId=xxx`

**Security Features:**
- Authentication required for all endpoints
- RBAC: CLIENT role has read-only access
- File validation:
  - Max file size: 5MB
  - Allowed types: JPEG, PNG, WebP, GIF, PDF

### 3. **UI Components**

#### Core Components
Located in `/components/attachments/`:

1. **FileUpload** - Upload component with validation
   - Drag & drop support
   - Multiple file upload
   - Real-time validation
   - Progress indication

2. **AttachmentList** - Grid display of attachments
   - Image preview thumbnails
   - File info (name, size)
   - Download/view in new tab
   - Delete functionality
   - Responsive grid layout

3. **AttachmentManager** - Combined upload + list
   - Auto-loads attachments on mount
   - Handles upload success/error
   - Shows attachment count

4. **AttachmentDialog** - Modal for viewing attachments
   - Reusable across entities
   - Clean separation from main UI

#### Integration Points

**Transactions:**
- Edit Transaction Dialog: Full attachment manager in expanded dialog
- TransactionAttachmentsBadge: Shows count badge with quick view

**Purchase Orders:**
- "Attachments" button in action column
- Opens dialog with full attachment manager

**Invoices:**
- "Attachments" button in action column
- Opens dialog with full attachment manager

### 4. **File Storage**

Using **Vercel Blob** for optimal performance:

**Benefits:**
- No database bloat (only URLs stored)
- Automatic CDN distribution
- Built-in optimization
- Scalable storage
- Fast upload/download

**Organization:**
Files are organized by entity type:
- `transactions/{transactionId}/{filename}`
- `purchase-orders/{poId}/{filename}`
- `invoices/{invoiceId}/{filename}`

## Setup Instructions

### 1. Install Dependencies
```bash
npm install @vercel/blob
```

### 2. Configure Vercel Blob
Add to `.env` or `.env.local`:
```env
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx
```

To get your token:
1. Go to Vercel Dashboard → Storage → Blob
2. Create a new blob store (if you don't have one)
3. Copy the read-write token

### 3. Run Database Migration
Apply the schema changes:

**Option A: Using Prisma (recommended)**
```bash
npx prisma migrate dev --name add_attachment_models
npx prisma generate
```

**Option B: Manual SQL (if Prisma fails)**
Run the SQL script in `prisma/migrations/add_attachment_models.sql` on your database.

### 4. Deploy
Push your changes and deploy to Vercel:
```bash
git add .
git commit -m "feat: add attachment support with Vercel Blob"
git push origin main
```

## Usage Guide

### For Administrators

#### Adding Attachments to Transactions
1. Open any transaction by clicking the edit icon
2. Scroll down to the "Attachments" section
3. Click "Upload Attachment" button
4. Select one or more files (max 5MB each)
5. Files are uploaded immediately
6. View by clicking on the thumbnail or download button

#### Adding Attachments to Purchase Orders
1. Go to Purchase Orders page
2. Find the PO you want to add attachments to
3. Click the "Attachments" button in the Actions column
4. Upload files using the upload button
5. Manage attachments in the dialog

#### Adding Attachments to Invoices
1. Go to Invoices page
2. Find the invoice you want to add attachments to
3. Click the "Attachments" button in the Actions column
4. Upload files using the upload button
5. Manage attachments in the dialog

### For Clients (Read-Only)
Clients with read-only access can:
- View all attachments
- Download attachments
- Cannot upload or delete attachments

## File Constraints

### Supported File Types
- **Images**: JPEG, JPG, PNG, WebP, GIF
- **Documents**: PDF

### Size Limits
- Maximum file size: **5MB per file**
- No limit on number of attachments per entity

### Performance Considerations
- Images are served via Vercel's CDN for fast loading
- Thumbnails are generated automatically for images
- PDFs show a file icon instead of preview

## Cost Considerations

### Vercel Blob Pricing (as of 2024)
**Free Tier (Hobby):**
- 100GB bandwidth/month
- Unlimited storage

**Pro Tier:**
- 1TB bandwidth/month included
- $0.15/GB additional bandwidth
- $0.15/GB storage/month

**Estimation:**
- 100 images @ 500KB each = 50MB storage
- 1,000 views/month = ~50GB bandwidth
- Well within free tier limits for most users

## Troubleshooting

### "Upload failed" Error
**Causes:**
1. File too large (>5MB)
2. Invalid file type
3. Missing BLOB_READ_WRITE_TOKEN
4. Network issues

**Solutions:**
1. Compress images before uploading
2. Ensure file is JPEG, PNG, WebP, GIF, or PDF
3. Check environment variables in Vercel
4. Retry upload

### Attachments Not Showing
**Causes:**
1. Database migration not applied
2. Prisma client not regenerated

**Solutions:**
```bash
npx prisma migrate deploy
npx prisma generate
```

### "Forbidden" Error When Uploading
**Causes:**
1. Logged in as CLIENT (read-only)
2. Session expired

**Solutions:**
1. Log in as ADMIN user
2. Refresh the page and log in again

## Technical Architecture

### Data Flow
```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ Upload File
       ▼
┌─────────────────┐
│  Next.js API    │
│  - Validate     │
│  - Auth Check   │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Vercel Blob    │
│  - Store File   │
│  - Return URL   │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│   PostgreSQL    │
│  - Save Metadata│
│  - Store URL    │
└─────────────────┘
```

### Security Model
1. **Authentication**: All endpoints require valid session
2. **Authorization**: RBAC enforced (CLIENT = read-only)
3. **Validation**: File type and size checked server-side
4. **Cascading Deletes**: Attachments deleted when parent entity is deleted

## Future Enhancements

Possible improvements:
1. Image compression before upload
2. Thumbnail generation
3. Batch upload progress bar
4. Attachment search/filter
5. Attachment categories/tags
6. OCR for document text extraction
7. Image editing tools
8. Video attachment support
9. Attachment versioning
10. Share attachments via link

## Support

For issues or questions:
1. Check this documentation
2. Review API route files for error messages
3. Check browser console for client-side errors
4. Check Vercel logs for server-side errors

## Conclusion

The attachment feature is now fully integrated into your ledger application with:
- ✅ Secure file storage via Vercel Blob
- ✅ Clean UI/UX for managing attachments
- ✅ Proper RBAC enforcement
- ✅ Efficient database design
- ✅ Scalable architecture

Enjoy enhanced record-keeping with visual documentation! 📎✨
