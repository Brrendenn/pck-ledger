// components/attachments/attachment-manager.tsx
'use client';

import { useState, useEffect } from 'react';
import { FileUpload } from './file-upload';
import { AttachmentList } from './attachment-list';
import { Loader2, Paperclip } from 'lucide-react';

interface Attachment {
  id: string;
  url: string;
  filename: string;
  filesize: number;
  mimetype: string;
  createdAt: string;
}

interface AttachmentManagerProps {
  entityId: string;
  entityType: 'transaction' | 'purchase-order' | 'invoice';
  readOnly?: boolean;
  autoLoad?: boolean;
}

export function AttachmentManager({
  entityId,
  entityType,
  readOnly = false,
  autoLoad = true,
}: AttachmentManagerProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const loadAttachments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(getApiEndpoint());
      if (!response.ok) {
        throw new Error('Failed to load attachments');
      }
      const data = await response.json();
      setAttachments(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load attachments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoLoad && entityId) {
      loadAttachments();
    }
  }, [entityId, autoLoad]);

  const handleUploadSuccess = (newAttachment: Attachment) => {
    setAttachments((prev) => [newAttachment, ...prev]);
  };

  const handleDelete = (attachmentId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Paperclip className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">
          Attachments ({attachments.length})
        </h3>
      </div>

      {!readOnly && (
        <FileUpload
          entityId={entityId}
          entityType={entityType}
          onUploadSuccess={handleUploadSuccess}
          onUploadError={(error) => setError(error)}
          multiple={true}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-sm text-red-600 py-4 text-center border border-red-200 rounded-lg bg-red-50">
          {error}
        </div>
      ) : (
        <AttachmentList
          attachments={attachments}
          onDelete={handleDelete}
          entityId={entityId}
          entityType={entityType}
          readOnly={readOnly}
        />
      )}
    </div>
  );
}
