import { useState } from 'react';

import * as Predicate from 'effect/Predicate';
import {
  CalendarClock,
  DoorOpen,
  LogOut,
  Play,
  QrCode,
  UserPlus,
  Users,
} from 'lucide-react';

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
  Card,
  cn,
  tw,
} from '@repo/ui';

import * as VisitPass from '#modules/visit-pass';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';

import { useShiftActions } from './porter-shift.hooks';
import type { PorterShiftState, ShiftStats } from './porteria.models';
import { describeShiftWindow, shiftElapsedMillis } from './shift-format.utils';

const LARGE_BUTTON = tw`h-12 px-5 text-base`;

/**
 * The Portero's Turno: how to start one (unplanned or planned) or, while open,
 * its live duration, counters and "Terminar turno".
 */
export function ShiftPanel({ state }: { state: PorterShiftState }) {
  const hasOpenShift =
    Predicate.isNotNull(state.openShift) &&
    Predicate.isNotNull(state.openShiftStats);

  if (!hasOpenShift) return <NoOpenShiftCard upcoming={state.upcoming} />;

  return (
    <div className="flex flex-col gap-4">
      <OpenShiftCard
        shift={state.openShift}
        stillInside={state.openShiftStats.stillInside}
      />
      <ShiftStatsGrid stats={state.openShiftStats} />
    </div>
  );
}

function NoOpenShiftCard({
  upcoming,
}: {
  upcoming: PorterShiftState['upcoming'];
}) {
  const { residentialUnitTimeZone } =
    MembershipRouteFeat.useCurrentMembership();
  const { startShift, isPending } = useShiftActions();

  return (
    <Card className="gap-5 px-5 py-5">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
          <CalendarClock className="size-5" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-0.5">
          <p className="text-lg font-semibold">Sin turno abierto</p>
          <p className="text-sm text-muted-foreground">
            Inicia tu Turno para registrar Ingresos y Salidas.
          </p>
        </div>
      </div>
      <Button
        className={LARGE_BUTTON}
        disabled={isPending}
        onClick={() => void startShift()}
      >
        <Play data-icon="inline-start" />
        Iniciar turno
      </Button>
      {upcoming.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            Turnos planeados
          </p>
          <ul className="flex flex-col gap-2">
            {upcoming.map((shift) => (
              <li
                key={shift._id}
                className="flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="text-sm font-medium">
                  {describeShiftWindow(shift, residentialUnitTimeZone)}
                </p>
                <Button
                  variant="outline"
                  className="h-11"
                  disabled={isPending}
                  onClick={() => void startShift(shift._id)}
                >
                  Iniciar este turno
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}

function OpenShiftCard({
  shift,
  stillInside,
}: {
  shift: VisitPass.ShiftSummary;
  stillInside: number;
}) {
  const { residentialUnitTimeZone } =
    MembershipRouteFeat.useCurrentMembership();
  const now = VisitPass.useNow(30_000);
  const { endShift, isPending } = useShiftActions();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const startedAt = shift.startedAt ?? now;

  return (
    <Card className="gap-4 bg-navy px-5 py-5 text-navy-foreground ring-0">
      <div className="flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.08em] uppercase opacity-85">
          <span
            aria-hidden="true"
            className="size-2 animate-pulse rounded-full bg-success"
          />
          Turno en curso
        </p>
        {Predicate.isNotUndefined(shift.plannedEnd) ? (
          <p className="text-xs opacity-80">
            Termina{' '}
            {VisitPass.formatTime(shift.plannedEnd, residentialUnitTimeZone)}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-4xl font-bold tracking-tight tabular-nums">
          {VisitPass.formatDuration(shiftElapsedMillis(shift, now))}
        </p>
        <p className="text-sm opacity-80">
          Desde las {VisitPass.formatTime(startedAt, residentialUnitTimeZone)}
        </p>
      </div>
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogTrigger
          render={
            <Button
              variant="secondary"
              className={cn(
                LARGE_BUTTON,
                'bg-white/10 text-current hover:bg-white/20'
              )}
            />
          }
        >
          <LogOut data-icon="inline-start" />
          Terminar turno
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Terminar tu Turno?</AlertDialogTitle>
            <AlertDialogDescription>
              Se marcará la hora de fin y no podrás registrar más Ingresos hasta
              iniciar otro Turno.
              {stillInside > 0
                ? ` Aún hay ${stillInside} ${stillInside === 1 ? 'Visitante' : 'Visitantes'} dentro; sus Salidas se pueden registrar en el siguiente Turno.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="h-11"
              disabled={isPending}
              onClick={async () => {
                const hasEnded = await endShift(shift._id);
                if (hasEnded) setIsConfirmOpen(false);
              }}
            >
              Terminar turno
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

/** Counters of the open Turno: total, inside, by origin and by Tipo de visita. */
export function ShiftStatsGrid({ stats }: { stats: ShiftStats }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <VisitPass.StatCard
        label="Visitas del turno"
        value={stats.total}
        icon={Users}
      />
      <VisitPass.StatCard
        label="Siguen dentro"
        value={stats.stillInside}
        icon={DoorOpen}
        tone="primary"
      />
      <BreakdownCard
        title="Origen"
        rows={[
          {
            label: VisitPass.VISIT_ORIGIN_LABELS.pass,
            value: stats.fromPass,
            icon: QrCode,
            barClassName: tw`bg-primary`,
          },
          {
            label: VisitPass.VISIT_ORIGIN_LABELS.manual,
            value: stats.manual,
            icon: UserPlus,
            barClassName: tw`bg-warning`,
          },
        ]}
      />
      <BreakdownCard
        title="Tipo de visita"
        rows={[
          {
            label: VisitPass.VISIT_TYPE_LABELS.temporary,
            value: stats.temporary,
            barClassName: tw`bg-primary`,
          },
          {
            label: VisitPass.VISIT_TYPE_LABELS.event,
            value: stats.event,
            barClassName: tw`bg-success`,
          },
          {
            label: VisitPass.VISIT_TYPE_LABELS.service,
            value: stats.service,
            barClassName: tw`bg-chart-4`,
          },
        ]}
      />
    </div>
  );
}

function BreakdownCard({
  title,
  rows,
}: {
  title: string;
  rows: ReadonlyArray<{
    label: string;
    value: number;
    icon?: typeof Users;
    barClassName: string;
  }>;
}) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  return (
    <Card className="col-span-2 gap-3 px-5 py-4 sm:col-span-1 lg:col-span-2">
      <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        {title}
      </p>
      <div
        className="flex h-2 overflow-hidden rounded-full bg-muted"
        aria-hidden="true"
      >
        {rows.map((row) => (
          <span
            key={row.label}
            className={row.barClassName}
            style={{ width: total === 0 ? 0 : `${(row.value / total) * 100}%` }}
          />
        ))}
      </div>
      <ul className="flex flex-col gap-1.5">
        {rows.map((row) => {
          const Icon = row.icon;

          return (
            <li key={row.label} className="flex items-center gap-2 text-sm">
              <span
                aria-hidden="true"
                className={cn('size-2.5 rounded-full', row.barClassName)}
              />
              {Icon ? (
                <Icon
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
              ) : null}
              <span className="flex-1">{row.label}</span>
              <span className="font-semibold tabular-nums">{row.value}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
