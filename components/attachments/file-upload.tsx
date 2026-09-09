// components/attachments/file-upload.tsx
'use client';

import { useState, useRef } from 'react';
import { Upload, Loader2, AlertCircle } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { compressImage } from '@/lib/compress-image';

interface FileUploadProps {
  onUploadSuccess?: (attachment: any) => void;
  onUploadError?: (error: string) => void;
  entityId: string;
  entityType: 'transaction' | 'purchase-order' | 'invoice';
  disabled?: boolean;
  multiple?: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf'
];

export function FileUpload({
  onUploadSuccess,
  onUploadError,
  entityId,
  entityType,
  disabled = false,
  multiple = false,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getApiEndpoint = () => {
    switch (entityType) {
      case 'transaction':
        return `/api/transactions/${entityId}/attachments`;
      case 'purchase-order':
        return `/api/purchase-orders/${entityId}/attachments`;
      case 'invoice':
        return `/api/invoices/${entityId}/attachments`;
      default:
        throw new Error('Invalid entity type');
    }
  };

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File "${file.name}" is too large (max 5MB)`;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `File "${file.name}" has invalid type. Allowed: JPEG, PNG, WebP, GIF, PDF`;
    }
    return null;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const rawFile = files[i];

        // Compress images before validation (may reduce size below limit)
        const file = await compressImage(rawFile);

        // Validate file
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          onUploadError?.(validationError);
          continue;
        }

        // Upload file
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(getApiEndpoint(), {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Upload failed');
        }

        const attachment = await response.json();
        onUploadSuccess?.(attachment);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to upload file';
      setError(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        multiple={multiple}
        onChange={handleFileChange}
        disabled={disabled || uploading}
        className="sr-only"
        id={`file-upload-${entityId}`}
      />
      <label
        htmlFor={`file-upload-${entityId}`}
        className={cn(
          buttonVariants({ variant: 'outline' }),
          'w-fit flex-row gap-2',
          (disabled || uploading) && 'pointer-events-none opacity-50'
        )}
        style={{
          display: 'inline-flex',
          flexDirection: 'row',
          boxShadow: 'none',
          outline: 'none',
        }}
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Upload Attachment
          </>
        )}
      </label>
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Max 5MB • JPEG, PNG, WebP, GIF, PDF • Images auto-compressed
      </p>
    </div>
  );
}
