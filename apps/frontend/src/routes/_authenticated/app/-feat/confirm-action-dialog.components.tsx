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
  Button,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  toast,
  useIsMobile,
} from '@repo/ui';

import * as VisitPass from '#modules/visit-pass';

/**
 * Asks before an irreversible action, as a bottom sheet on mobile and an alert
 * dialog elsewhere. `onConfirm` resolves `true` to close it; the confirm button
 * stays disabled while it runs, and a rejection is toasted and keeps it open.
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
  const isMobile = useIsMobile();
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

  const confirmVariant = destructive ? 'destructive' : 'default';

  if (isMobile)
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={trigger}>{triggerContent}</SheetTrigger>
        <SheetContent side="bottom" className="gap-0 rounded-t-2xl">
          <SheetHeader className="pr-14">
            <SheetTitle className="text-lg font-semibold">{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <SheetFooter>
            <Button
              variant={confirmVariant}
              className="h-12 text-base"
              disabled={isPending}
              onClick={() => void handleConfirm()}
            >
              {confirmLabel}
            </Button>
            <SheetClose
              disabled={isPending}
              render={<Button variant="outline" className="h-12 text-base" />}
            >
              Volver
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );

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
            variant={confirmVariant}
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
