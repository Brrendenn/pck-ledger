// components/ledger/transaction-attachments-badge.tsx
'use client';

import { useState, useEffect } from 'react';
import { Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AttachmentManager } from '@/components/attachments';

interface TransactionAttachmentsBadgeProps {
  transactionId: string;
}

export function TransactionAttachmentsBadge({ transactionId }: TransactionAttachmentsBadgeProps) {
  const [attachmentCount, setAttachmentCount] = useState<number>(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Fetch attachment count
    const fetchCount = async () => {
      try {
        const response = await fetch(`/api/transactions/${transactionId}/attachments`);
        if (response.ok) {
          const attachments = await response.json();
          setAttachmentCount(attachments.length);
        }
      } catch (error) {
        console.error('Failed to fetch attachment count:', error);
      }
    };

    fetchCount();
  }, [transactionId, open]); // Refresh when dialog closes

  if (attachmentCount === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs gap-1"
        >
          <Paperclip className="h-3 w-3" />
          <span>{attachmentCount}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transaction Attachments</DialogTitle>
        </DialogHeader>
        <AttachmentManager
          entityId={transactionId}
          entityType="transaction"
          autoLoad={open}
        />
      </DialogContent>
    </Dialog>
  );
}
