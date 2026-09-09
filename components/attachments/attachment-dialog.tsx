// components/attachments/attachment-dialog.tsx
'use client';

import { useState } from 'react';
import { Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AttachmentManager } from './attachment-manager';

interface AttachmentDialogProps {
  entityId: string;
  entityType: 'transaction' | 'purchase-order' | 'invoice';
  entityLabel: string; // e.g., "PO-2024-001" or "Invoice #145"
  triggerVariant?: 'default' | 'outline' | 'ghost';
  triggerSize?: 'default' | 'sm' | 'lg' | 'icon';
  readOnly?: boolean;
}

export function AttachmentDialog({
  entityId,
  entityType,
  entityLabel,
  triggerVariant = 'outline',
  triggerSize = 'sm',
  readOnly = false,
}: AttachmentDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize} className="gap-1.5">
          <Paperclip className="h-4 w-4" />
          Attachments
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Attachments - {entityLabel}
          </DialogTitle>
        </DialogHeader>
        <AttachmentManager
          entityId={entityId}
          entityType={entityType}
          autoLoad={open}
          readOnly={readOnly}
        />
      </DialogContent>
    </Dialog>
  );
}
