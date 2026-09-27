import { type ReactElement, type ReactNode, useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  toast,
} from '@repo/ui';

import * as VisitPass from '#modules/visit-pass';

/**
 * Asks before an irreversible action. `onConfirm` resolves `true` to close the
 * dialog; the confirm button stays disabled while it runs, and a rejection is
 * toasted and keeps the dialog open.
 */
export function ConfirmActionDialog({
  trigger,
  triggerContent,
  title,
  description,
  confirmLabel,
  destructive = false,
  onConfirm,
}: {
  /** Element the trigger renders as, such as a `Button` without children. */
  trigger: ReactElement;
  triggerContent: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleConfirm = async () => {
    setIsPending(true);
    const shouldClose = await onConfirm().catch((error: unknown) => {
      toast.error(VisitPass.describeBackendError(error));
      return false;
    });
    setIsPending(false);

    if (shouldClose) setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={trigger}>{triggerContent}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Volver</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? 'destructive' : 'default'}
            disabled={isPending}
            onClick={() => void handleConfirm()}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
