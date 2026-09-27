import { type ReactNode, useState } from 'react';

import { QueryResult, useMutation } from '@confect/react';
import { createFileRoute } from '@tanstack/react-router';
import * as Predicate from 'effect/Predicate';
import * as Result from 'effect/Result';
import {
  CalendarClock,
  CalendarPlus,
  ChevronRight,
  CircleStop,
  Trash2,
} from 'lucide-react';

import refs from '@repo/backend/refs';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  Skeleton,
  toast,
} from '@repo/ui';

import * as VisitPass from '#modules/visit-pass';
import * as AppRouteFeat from '#routes/_authenticated/app/-feat';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';
import * as AdminRouteFeat from '#routes/_authenticated/app/m/$membershipId/admin/-feat';

import * as TurnosRouteFeat from './-feat';

export const Route = createFileRoute(
  '/_authenticated/app/m/$membershipId/admin/turnos/'
)({
  component: AdminShiftsPage,
});

type PendingAction = {
  readonly kind: 'forceClose' | 'cancel';
  readonly shift: VisitPass.ShiftSummary;
};

/** Plans Turnos and follows them: in progress, scheduled and closed. */
function AdminShiftsPage() {
  const membership = MembershipRouteFeat.useCurrentMembership();
  const now = VisitPass.useNow();
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null
  );

  const shifts = VisitPass.useStableQuery(refs.public.shifts.listForUnit, {
    membershipId: membership.membershipId,
    now,
  });
  // Read the selected Turno from the live list so the sheet follows its status.
  const selectedShift = QueryResult.isSuccess(shifts)
    ? (shifts.value.find((shift) => shift._id === selectedShiftId) ?? null)
    : null;

  return (
    <>
      <VisitPass.PageHeader
        eyebrow="Portería"
        title="Turnos"
        description="Programa los Turnos de los Porteros. Ellos marcan el inicio y el fin reales desde portería."
        actions={
          <Button onClick={() => setIsScheduleOpen(true)}>
            <CalendarPlus aria-hidden="true" />
            Programar turno
          </Button>
        }
      />

      <AdminRouteFeat.QueryView
        result={shifts}
        loading={
          <div className="flex flex-col gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        }
      >
        {(value) => {
          const open = value
            .filter((shift) => shift.status === 'open')
            .sort(
              (left, right) => (left.startedAt ?? 0) - (right.startedAt ?? 0)
            );
          const scheduled = value
            .filter((shift) => shift.status === 'scheduled')
            .sort(
              (left, right) =>
                (left.plannedStart ?? 0) - (right.plannedStart ?? 0)
            );
          const closed = value
            .filter((shift) => shift.status === 'closed')
            .sort((left, right) => (right.endedAt ?? 0) - (left.endedAt ?? 0));

          if (value.length === 0)
            return (
              <VisitPass.EmptyState
                icon={CalendarClock}
                title="Aún no hay Turnos"
                description="Programa el primero. Un Portero también puede iniciar un Turno no programado desde portería."
                action={
                  <Button onClick={() => setIsScheduleOpen(true)}>
                    <CalendarPlus aria-hidden="true" />
                    Programar turno
                  </Button>
                }
              />
            );

          return (
            <div className="flex flex-col gap-8">
              <ShiftSection
                title="En curso"
                emptyText="Ningún Portero tiene un Turno abierto."
                shifts={open}
                renderShift={(shift) => (
                  <ShiftRow
                    key={shift._id}
                    shift={shift}
                    now={now}
                    onOpen={() => setSelectedShiftId(shift._id)}
                    action={
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPendingAction({ kind: 'forceClose', shift })
                        }
                      >
                        <CircleStop aria-hidden="true" />
                        Cerrar turno
                      </Button>
                    }
                  />
                )}
              />
              <ShiftSection
                title="Programados"
                emptyText="No hay Turnos programados."
                shifts={scheduled}
                renderShift={(shift) => (
                  <ShiftRow
                    key={shift._id}
                    shift={shift}
                    now={now}
                    onOpen={() => setSelectedShiftId(shift._id)}
                    action={
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setPendingAction({ kind: 'cancel', shift })
                        }
                      >
                        <Trash2 aria-hidden="true" />
                        Cancelar
                      </Button>
                    }
                  />
                )}
              />
              <ShiftSection
                title="Cerrados"
                emptyText="Aún no hay Turnos cerrados."
                shifts={closed}
                renderShift={(shift) => (
                  <ShiftRow
                    key={shift._id}
                    shift={shift}
                    now={now}
                    onOpen={() => setSelectedShiftId(shift._id)}
                  />
                )}
              />
            </div>
          );
        }}
      </AdminRouteFeat.QueryView>

      <AdminRouteFeat.ScheduleShiftDialog
        open={isScheduleOpen}
        onOpenChange={setIsScheduleOpen}
      />
      <TurnosRouteFeat.ShiftDetailSheet
        shift={selectedShift}
        onClose={() => setSelectedShiftId(null)}
      />
      <ShiftActionDialog
        action={pendingAction}
        onClose={() => setPendingAction(null)}
      />
    </>
  );
}

function ShiftSection({
  title,
  emptyText,
  shifts,
  renderShift,
}: {
  title: string;
  emptyText: string;
  shifts: ReadonlyArray<VisitPass.ShiftSummary>;
  renderShift: (shift: VisitPass.ShiftSummary) => ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        {title}
        <Badge variant="secondary">{shifts.length}</Badge>
      </h2>
      {shifts.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-4 text-sm text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <Card className="gap-0 py-0">
          <ul className="flex flex-col divide-y">{shifts.map(renderShift)}</ul>
        </Card>
      )}
    </section>
  );
}

function ShiftRow({
  shift,
  now,
  onOpen,
  action,
}: {
  shift: VisitPass.ShiftSummary;
  now: number;
  onOpen: () => void;
  action?: ReactNode;
}) {
  const membership = MembershipRouteFeat.useCurrentMembership();
  const timeZone = membership.residentialUnitTimeZone;
  const isLate =
    shift.status === 'scheduled' &&
    Predicate.isNotUndefined(shift.plannedStart) &&
    shift.plannedStart < now;
  const isUnplanned =
    shift.status !== 'scheduled' && Predicate.isUndefined(shift.plannedStart);

  return (
    <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={onOpen}
        className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <VisitPass.InitialsAvatar
          initials={VisitPass.initialsOf(shift.porterName)}
        />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium">{shift.porterName}</span>
            {isLate ? <Badge variant="warning">Sin iniciar</Badge> : null}
            {isUnplanned ? (
              <Badge variant="outline">No programado</Badge>
            ) : null}
            {shift.closedByAdministrator ? (
              <Badge variant="warning">Cerrado por administración</Badge>
            ) : null}
          </span>
          <span className="truncate text-sm text-muted-foreground">
            {TurnosRouteFeat.describeShiftWindow(shift, timeZone)}
          </span>
          {Predicate.isUndefined(shift.startedAt) ? null : (
            <span className="text-xs text-muted-foreground">
              {shift.status === 'open' ? 'Lleva ' : 'Duró '}
              {VisitPass.formatDuration(
                (shift.endedAt ?? now) - shift.startedAt
              )}
            </span>
          )}
        </span>
        <ChevronRight
          className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </button>
      {action ? (
        <div className="flex justify-end pl-13 sm:pl-0">{action}</div>
      ) : null}
    </li>
  );
}

const ACTION_COPY = {
  forceClose: {
    title: '¿Cerrar este Turno?',
    description:
      'Úsalo cuando el Portero olvidó cerrar su Turno. Queda cerrado ahora y marcado como cerrado por administración.',
    confirm: 'Cerrar turno',
    success: 'Turno cerrado.',
  },
  cancel: {
    title: '¿Cancelar este Turno programado?',
    description:
      'El Turno aún no empieza, así que se elimina de la programación.',
    confirm: 'Cancelar turno',
    success: 'Turno programado cancelado.',
  },
} as const satisfies Record<
  PendingAction['kind'],
  { title: string; description: string; confirm: string; success: string }
>;

function ShiftActionDialog({
  action,
  onClose,
}: {
  action: PendingAction | null;
  onClose: () => void;
}) {
  const membership = MembershipRouteFeat.useCurrentMembership();
  const forceClose = useMutation(refs.public.shifts.forceClose);
  const cancelScheduled = useMutation(refs.public.shifts.cancelScheduled);
  const [isRunning, setIsRunning] = useState(false);
  const copy = ACTION_COPY[action?.kind ?? 'cancel'];

  const handleConfirm = async () => {
    if (Predicate.isNull(action)) return;

    const args = {
      membershipId: membership.membershipId,
      shiftId: action.shift._id,
    };

    setIsRunning(true);
    const result = await AppRouteFeat.settleMutation(
      action.kind === 'forceClose' ? forceClose(args) : cancelScheduled(args)
    );
    setIsRunning(false);

    if (Result.isFailure(result)) {
      toast.error(VisitPass.describeBackendError(result.failure));
      return;
    }

    toast.success(copy.success);
    onClose();
  };

  return (
    <AlertDialog
      open={Predicate.isNotNull(action)}
      onOpenChange={(open) => (open ? undefined : onClose())}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {action ? `Turno de ${action.shift.porterName}. ` : null}
            {copy.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Volver</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={isRunning}
            onClick={() => void handleConfirm()}
          >
            {copy.confirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
