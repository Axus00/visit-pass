import { TriangleAlert } from 'lucide-react';

import { Button } from '@repo/ui';

import { useShiftActions } from './porter-shift.hooks';

/** Warns that Ingresos need an open Turno and starts an unplanned one. */
export function StartShiftBanner() {
  const { startShift, isPending } = useShiftActions();

  return (
    <div
      role="status"
      className="relative flex flex-col gap-3 overflow-hidden rounded-xl bg-warning/12 px-5 py-4 ring-1 ring-warning/40 sm:flex-row sm:items-center dark:bg-warning/10"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1 bg-warning"
      />
      <TriangleAlert
        className="size-6 shrink-0 text-warning-foreground dark:text-warning"
        aria-hidden="true"
      />
      <div className="flex flex-1 flex-col gap-0.5">
        <p className="font-semibold">No tienes un Turno abierto</p>
        <p className="text-sm text-muted-foreground">
          Inicia tu Turno para poder registrar Ingresos.
        </p>
      </div>
      <Button
        className="h-12 px-5 text-base"
        disabled={isPending}
        onClick={() => void startShift()}
      >
        Iniciar turno
      </Button>
    </div>
  );
}
