import { useState } from 'react';

import { QueryResult, useQuery } from '@confect/react';
import { createFileRoute } from '@tanstack/react-router';
import * as Predicate from 'effect/Predicate';
import { ClipboardList, DoorOpen, SearchX } from 'lucide-react';

import refs from '@repo/backend/refs';
import {
  Badge,
  Button,
  Card,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@repo/ui';

import * as CommonUI from '#modules/common-ui';
import * as VisitPass from '#modules/visit-pass';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';
import * as AdminRouteFeat from '#routes/_authenticated/app/m/$membershipId/admin/-feat';

export const Route = createFileRoute(
  '/_authenticated/app/m/$membershipId/admin/visitas/'
)({
  component: AdminVisitsPage,
});

type VisitsTab = 'history' | 'inside';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'inside', label: 'Dentro' },
  { value: 'exited', label: 'Salió' },
  { value: 'voided', label: 'Anuladas' },
] as const satisfies ReadonlyArray<
  AdminRouteFeat.SelectOption<AdminRouteFeat.VisitFilters['status']>
>;

const VISIT_TYPE_OPTIONS = [
  { value: 'all', label: 'Todos los tipos' },
  { value: 'temporary', label: VisitPass.VISIT_TYPE_LABELS.temporary },
  { value: 'event', label: VisitPass.VISIT_TYPE_LABELS.event },
  { value: 'service', label: VisitPass.VISIT_TYPE_LABELS.service },
] as const satisfies ReadonlyArray<
  AdminRouteFeat.SelectOption<AdminRouteFeat.VisitFilters['visitType']>
>;

const ORIGIN_OPTIONS = [
  { value: 'all', label: 'Todos los orígenes' },
  { value: 'pass', label: VisitPass.VISIT_ORIGIN_LABELS.pass },
  { value: 'manual', label: VisitPass.VISIT_ORIGIN_LABELS.manual },
] as const satisfies ReadonlyArray<
  AdminRouteFeat.SelectOption<AdminRouteFeat.VisitFilters['origin']>
>;

/** Every recent Visita of the unit, searchable, plus who is inside right now. */
function AdminVisitsPage() {
  const membership = MembershipRouteFeat.useCurrentMembership();
  const now = VisitPass.useNow();
  const [tab, setTab] = useState<VisitsTab>('history');
  const [filters, setFilters] = useState(AdminRouteFeat.EMPTY_VISIT_FILTERS);
  const [visitToVoid, setVisitToVoid] = useState<VisitPass.VisitSummary | null>(
    null
  );

  const recent = useQuery(refs.public.visits.listRecentForUnit, {
    membershipId: membership.membershipId,
  });
  const inside = useQuery(refs.public.visits.listInside, {
    membershipId: membership.membershipId,
  });

  const insideCount = QueryResult.isSuccess(inside)
    ? inside.value.filter((visit) => !visit.voided).length
    : null;
  const activeResult = tab === 'history' ? recent : inside;
  // "Dentro ahora" already means inside, so its status filter stays out.
  const activeFilters =
    tab === 'history' ? filters : { ...filters, status: 'inside' as const };
  const hasFilters =
    filters.search.trim().length > 0 ||
    filters.visitType !== 'all' ||
    filters.origin !== 'all' ||
    (tab === 'history' && filters.status !== 'all');

  return (
    <>
      <VisitPass.PageHeader
        eyebrow="Portería"
        title="Visitas"
        description="Los Ingresos y Salidas registrados por los Porteros. Las Visitas anuladas quedan en el historial con su motivo."
      />

      <Tabs value={tab} onValueChange={(value) => setTab(value as VisitsTab)}>
        <TabsList>
          <TabsTrigger value="history">
            <ClipboardList aria-hidden="true" />
            Historial
          </TabsTrigger>
          <TabsTrigger value="inside">
            <DoorOpen aria-hidden="true" />
            Dentro ahora
            {Predicate.isNull(insideCount) ? null : (
              <Badge variant="success" className="ml-1">
                {insideCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
        <CommonUI.SearchField
          text={filters.search}
          onTextChange={(search) => setFilters({ ...filters, search })}
          onClear={() => setFilters({ ...filters, search: '' })}
          placeholder="Nombre, documento, placa o Apartamento"
          ariaLabel="Buscar Visitas"
          className="sm:col-span-2 lg:col-span-1"
        />
        {tab === 'history' ? (
          <AdminRouteFeat.SelectField
            label="Estado"
            hideLabel
            value={filters.status}
            onValueChange={(status) => setFilters({ ...filters, status })}
            options={STATUS_OPTIONS}
          />
        ) : null}
        <AdminRouteFeat.SelectField
          label="Tipo de visita"
          hideLabel
          value={filters.visitType}
          onValueChange={(visitType) => setFilters({ ...filters, visitType })}
          options={VISIT_TYPE_OPTIONS}
        />
        <AdminRouteFeat.SelectField
          label="Origen"
          hideLabel
          value={filters.origin}
          onValueChange={(origin) => setFilters({ ...filters, origin })}
          options={ORIGIN_OPTIONS}
        />
      </div>

      <AdminRouteFeat.QueryView
        result={activeResult}
        loading={
          <Card className="gap-2 p-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </Card>
        }
      >
        {(visits) => {
          const filtered = AdminRouteFeat.filterVisits(visits, activeFilters);

          if (visits.length === 0)
            return (
              <VisitPass.EmptyState
                icon={tab === 'history' ? ClipboardList : DoorOpen}
                title={
                  tab === 'history'
                    ? 'Aún no hay Visitas'
                    : 'No hay Visitantes dentro'
                }
                description={
                  tab === 'history'
                    ? 'Aparecerán aquí en cuanto un Portero registre el primer Ingreso.'
                    : 'Cuando un Portero registre un Ingreso sin Salida, aparecerá aquí.'
                }
              />
            );

          if (filtered.length === 0)
            return (
              <VisitPass.EmptyState
                icon={SearchX}
                title="Ninguna Visita coincide"
                description="Prueba con otra búsqueda o quita los filtros."
                action={
                  hasFilters ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        setFilters(AdminRouteFeat.EMPTY_VISIT_FILTERS)
                      }
                    >
                      Quitar filtros
                    </Button>
                  ) : null
                }
              />
            );

          return (
            <Card className="gap-0 py-0">
              <AdminRouteFeat.VisitList
                visits={filtered}
                timeZone={membership.residentialUnitTimeZone}
                now={now}
                onVoid={setVisitToVoid}
                showPorter
              />
              <p className="border-t px-4 py-3 text-xs text-muted-foreground">
                {filtered.length === visits.length
                  ? `${visits.length} Visitas`
                  : `${filtered.length} de ${visits.length} Visitas`}
                {tab === 'history'
                  ? ' · se muestran las más recientes de la unidad'
                  : null}
              </p>
            </Card>
          );
        }}
      </AdminRouteFeat.QueryView>

      <AdminRouteFeat.VoidVisitDialog
        visit={visitToVoid}
        onClose={() => setVisitToVoid(null)}
      />
    </>
  );
}
