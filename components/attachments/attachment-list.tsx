// components/attachments/attachment-list.tsx
'use client';

import { useState } from 'react';
import { Trash2, Download, FileText, Image as ImageIcon, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Attachment {
  id: string;
  url: string;
  filename: string;
  filesize: number;
  mimetype: string;
  createdAt: string;
}

interface AttachmentListProps {
  attachments: Attachment[];
  onDelete?: (attachmentId: string) => void;
  entityId: string;
  entityType: 'transaction' | 'purchase-order' | 'invoice';
  readOnly?: boolean;
}

export function AttachmentList({
  attachments,
  onDelete,
  entityId,
  entityType,
  readOnly = false,
}: AttachmentListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);

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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const isImage = (mimetype: string) => {
    return mimetype.startsWith('image/');
  };

  const handleDeleteClick = (attachment: Attachment) => {
    setSelectedAttachment(attachment);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAttachment) return;

    setDeletingId(selectedAttachment.id);
    try {
      const response = await fetch(
        `${getApiEndpoint()}?attachmentId=${selectedAttachment.id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to delete attachment');
      }

      onDelete?.(selectedAttachment.id);
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete attachment');
    } finally {
      setDeletingId(null);
      setDeleteDialogOpen(false);
      setSelectedAttachment(null);
    }
  };

  const handleDownload = (attachment: Attachment) => {
    window.open(attachment.url, '_blank');
  };

  if (attachments.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
        No attachments yet
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
          >
            {/* Preview */}
            <div className="bg-muted h-40 flex items-center justify-center relative group">
              {isImage(attachment.mimetype) ? (
                <img
                  src={attachment.url}
                  alt={attachment.filename}
                  className="w-full h-full object-cover"
                />
              ) : (
                <FileText className="h-16 w-16 text-muted-foreground" />
              )}
              {/* Overlay on hover */}
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <ExternalLink className="h-8 w-8 text-white" />
              </a>
            </div>

            {/* Info */}
            <div className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" title={attachment.filename}>
                    {attachment.filename}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.filesize)}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleDownload(attachment)}
                >
                  <Download className="h-3 w-3 mr-1" />
                  View
                </Button>
                {!readOnly && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteClick(attachment)}
                    disabled={deletingId === attachment.id}
                  >
                    {deletingId === attachment.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedAttachment?.filename}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
