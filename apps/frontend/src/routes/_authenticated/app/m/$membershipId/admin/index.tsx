import { useState } from 'react';

import { useQuery } from '@confect/react';
import { Link, createFileRoute } from '@tanstack/react-router';
import * as Predicate from 'effect/Predicate';
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CalendarPlus,
  ChevronRight,
  ClipboardList,
  DoorOpen,
  FileSpreadsheet,
  MailQuestion,
  Settings,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';

import refs from '@repo/backend/refs';
import {
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@repo/ui';

import * as CommonUI from '#modules/common-ui';
import * as VisitPass from '#modules/visit-pass';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';

import * as AdminRouteFeat from './-feat';

export const Route = createFileRoute(
  '/_authenticated/app/m/$membershipId/admin/'
)({
  component: AdminHomePage,
});

const RECENT_VISIT_LIMIT = 8;
const RECENT_REPORT_LIMIT = 3;

const MORE_LINKS = [
  {
    to: '/app/m/$membershipId/admin/apartamentos',
    label: 'Apartamentos',
    icon: Building2,
  },
  {
    to: '/app/m/$membershipId/admin/reportes',
    label: 'Reportes de turno',
    icon: FileSpreadsheet,
  },
  {
    to: '/app/m/$membershipId/admin/ajustes',
    label: 'Ajustes',
    icon: Settings,
  },
] as const;

type OpenDialog = 'invite' | 'schedule' | 'apartments' | null;

/** Administrador dashboard: counters, quick altas and what is happening now. */
function AdminHomePage() {
  const membership = MembershipRouteFeat.useCurrentMembership();
  const now = VisitPass.useNow();
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null);

  const overview = VisitPass.useStableQuery(
    refs.public.residentialUnits.getOverview,
    { membershipId: membership.membershipId, now }
  );

  const dialogProps = (dialog: Exclude<OpenDialog, null>) => ({
    open: openDialog === dialog,
    onOpenChange: (open: boolean) => setOpenDialog(open ? dialog : null),
  });

  return (
    <>
      <VisitPass.PageHeader
        eyebrow="Panel del Administrador"
        title={membership.residentialUnitName}
        description="Lo que pasa hoy en portería y las altas de tu Unidad residencial."
        actions={
          <>
            <Button onClick={() => setOpenDialog('invite')}>
              <UserPlus aria-hidden="true" />
              Invitar persona
            </Button>
            <Button variant="outline" onClick={() => setOpenDialog('schedule')}>
              <CalendarPlus aria-hidden="true" />
              Programar turno
            </Button>
            <Button
              variant="outline"
              onClick={() => setOpenDialog('apartments')}
            >
              <Building2 aria-hidden="true" />
              Agregar apartamentos
            </Button>
          </>
        }
      />

      <AdminRouteFeat.QueryView
        result={overview}
        loading={
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-6">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-32" />
            ))}
          </div>
        }
      >
        {(value) => <OverviewStats overview={value} />}
      </AdminRouteFeat.QueryView>

      <div className="grid gap-6 xl:grid-cols-3">
        <RecentVisitsCard now={now} />
        <div className="grid gap-6 lg:grid-cols-2 xl:flex xl:flex-col">
          <OnDutyCard now={now} />
          <RecentReportsCard />
        </div>
      </div>

      <nav aria-label="Más secciones" className="lg:hidden">
        <Card className="gap-0 py-0">
          <ul className="flex flex-col divide-y">
            {MORE_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  params={{ membershipId: membership.membershipId }}
                  className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium outline-none hover:bg-accent/60 focus-visible:bg-accent"
                >
                  <link.icon
                    className="size-5 text-primary"
                    aria-hidden="true"
                  />
                  <span className="flex-1">{link.label}</span>
                  <ChevronRight
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </nav>

      <AdminRouteFeat.InviteMemberDialog {...dialogProps('invite')} />
      <AdminRouteFeat.ScheduleShiftDialog {...dialogProps('schedule')} />
      <AdminRouteFeat.CreateApartmentsDialog {...dialogProps('apartments')} />
    </>
  );
}

function OverviewStats({
  overview,
}: {
  overview: AdminRouteFeat.UnitOverview;
}) {
  return (
    <section
      aria-label="Resumen de hoy"
      className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-6"
    >
      <VisitPass.StatCard
        label="Visitas hoy"
        value={overview.visitsToday}
        icon={ClipboardList}
        tone="primary"
      />
      <VisitPass.StatCard
        label="Visitantes dentro"
        value={overview.visitorsInside}
        icon={DoorOpen}
        tone="navy"
      />
      <VisitPass.StatCard
        label="Residentes activos"
        value={overview.activeResidentCount}
        icon={Users}
      />
      <VisitPass.StatCard
        label="Porteros en turno"
        value={overview.openShiftCount}
        icon={ShieldCheck}
        hint={`${overview.porterCount} Porteros en total`}
      />
      <VisitPass.StatCard
        label="Invitaciones pendientes"
        value={overview.pendingMembershipCount}
        icon={MailQuestion}
        hint="Esperan que la persona inicie sesión"
      />
      <VisitPass.StatCard
        label="Apartamentos"
        value={overview.apartmentCount}
        icon={Building2}
      />
    </section>
  );
}

function RecentVisitsCard({ now }: { now: number }) {
  const membership = MembershipRouteFeat.useCurrentMembership();
  const visits = useQuery(refs.public.visits.listRecentForUnit, {
    membershipId: membership.membershipId,
  });

  return (
    <Card className="gap-0 pb-0 xl:col-span-2">
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-lg">Registro de accesos</CardTitle>
        <CardDescription>
          Los últimos Ingresos y Salidas en portería.
        </CardDescription>
        <CardAction>
          <CommonUI.NavLinkButton
            to="/app/m/$membershipId/admin/visitas"
            params={{ membershipId: membership.membershipId }}
            variant="outline"
            size="sm"
          >
            Ver todo
            <ArrowRight aria-hidden="true" />
          </CommonUI.NavLinkButton>
        </CardAction>
      </CardHeader>
      <AdminRouteFeat.QueryView
        result={visits}
        loading={
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        }
      >
        {(value) =>
          value.length === 0 ? (
            <VisitPass.EmptyState
              icon={ClipboardList}
              title="Aún no hay Visitas"
              description="Aparecerán aquí en cuanto un Portero registre el primer Ingreso."
              className="m-4"
            />
          ) : (
            <AdminRouteFeat.VisitList
              visits={value.slice(0, RECENT_VISIT_LIMIT)}
              timeZone={membership.residentialUnitTimeZone}
              now={now}
            />
          )
        }
      </AdminRouteFeat.QueryView>
    </Card>
  );
}

function OnDutyCard({ now }: { now: number }) {
  const membership = MembershipRouteFeat.useCurrentMembership();
  const shifts = VisitPass.useStableQuery(refs.public.shifts.listForUnit, {
    membershipId: membership.membershipId,
    now,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          Porteros en turno
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-success" />
          </span>
        </CardTitle>
        <CardAction>
          <CommonUI.NavLinkButton
            to="/app/m/$membershipId/admin/turnos"
            params={{ membershipId: membership.membershipId }}
            variant="ghost"
            size="sm"
          >
            Turnos
            <ArrowRight aria-hidden="true" />
          </CommonUI.NavLinkButton>
        </CardAction>
      </CardHeader>
      <CardContent>
        <AdminRouteFeat.QueryView
          result={shifts}
          loading={<Skeleton className="h-16" />}
        >
          {(value) => {
            const openShifts = value.filter((shift) => shift.status === 'open');

            if (openShifts.length === 0)
              return (
                <p className="rounded-lg bg-muted px-3 py-3 text-sm text-muted-foreground">
                  Ningún Portero tiene un Turno abierto ahora.
                </p>
              );

            return (
              <ul className="flex flex-col gap-3">
                {openShifts.map((shift) => (
                  <li key={shift._id} className="flex items-center gap-3">
                    <VisitPass.InitialsAvatar
                      initials={VisitPass.initialsOf(shift.porterName)}
                    />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="truncate text-sm font-medium">
                        {shift.porterName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {Predicate.isUndefined(shift.startedAt)
                          ? 'En curso'
                          : `Desde las ${VisitPass.formatTime(shift.startedAt, membership.residentialUnitTimeZone)} · ${VisitPass.formatDuration(now - shift.startedAt)}`}
                      </p>
                    </div>
                    <CalendarClock
                      className="size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </li>
                ))}
              </ul>
            );
          }}
        </AdminRouteFeat.QueryView>
      </CardContent>
    </Card>
  );
}

function RecentReportsCard() {
  const membership = MembershipRouteFeat.useCurrentMembership();
  const reports = useQuery(refs.public.shiftReports.listForUnit, {
    membershipId: membership.membershipId,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Reportes de turno</CardTitle>
        <CardDescription>Los últimos generados en tu unidad.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <AdminRouteFeat.QueryView
          result={reports}
          loading={<Skeleton className="h-16" />}
        >
          {(value) =>
            value.length === 0 ? (
              <p className="rounded-lg bg-muted px-3 py-3 text-sm text-muted-foreground">
                Aún no hay Reportes de turno. Se generan desde cada Turno.
              </p>
            ) : (
              value
                .slice(0, RECENT_REPORT_LIMIT)
                .map((report) => (
                  <AdminRouteFeat.ShiftReportItem
                    key={report._id}
                    report={report}
                    timeZone={membership.residentialUnitTimeZone}
                  />
                ))
            )
          }
        </AdminRouteFeat.QueryView>
        <CommonUI.NavLinkButton
          to="/app/m/$membershipId/admin/reportes"
          params={{ membershipId: membership.membershipId }}
          variant="outline"
          className="w-full"
        >
          Ver todos los reportes
        </CommonUI.NavLinkButton>
      </CardContent>
    </Card>
  );
}
