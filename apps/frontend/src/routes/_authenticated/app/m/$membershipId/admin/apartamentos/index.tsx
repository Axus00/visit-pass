import { useState } from 'react';

import { useQuery } from '@confect/react';
import { createFileRoute } from '@tanstack/react-router';
import * as Predicate from 'effect/Predicate';
import { Building2, Plus, Users } from 'lucide-react';

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
  cn,
} from '@repo/ui';

import * as VisitPass from '#modules/visit-pass';
import * as MembershipRouteFeat from '#routes/_authenticated/app/m/$membershipId/-feat';
import * as AdminRouteFeat from '#routes/_authenticated/app/m/$membershipId/admin/-feat';

export const Route = createFileRoute(
  '/_authenticated/app/m/$membershipId/admin/apartamentos/'
)({
  component: AdminApartmentsPage,
});

/** `1 Torre`, `2 Torres`: Spanish plurals of the counts on this page. */
function countOf(count: number, singular: string, plural: string) {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

const APARTMENT_WORDS = ['Apartamento', 'Apartamentos'] as const;
const RESIDENT_WORDS = ['Residente activo', 'Residentes activos'] as const;

/** The unit's Apartamentos by Torre, with how many active Residentes each has. */
function AdminApartmentsPage() {
  const membership = MembershipRouteFeat.useCurrentMembership();
  const [dialogTower, setDialogTower] = useState<string | null>(null);

  const apartments = useQuery(refs.public.residentialUnits.listApartments, {
    membershipId: membership.membershipId,
  });

  return (
    <>
      <VisitPass.PageHeader
        eyebrow="Unidad residencial"
        title="Apartamentos"
        description="Cada Visita va a un Apartamento. Vincula Residentes invitándolos desde Membresías."
        actions={
          <Button onClick={() => setDialogTower('')}>
            <Plus aria-hidden="true" />
            Agregar apartamentos
          </Button>
        }
      />

      <AdminRouteFeat.QueryView
        result={apartments}
        loading={
          <div className="flex flex-col gap-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        }
      >
        {(value) => {
          if (value.length === 0)
            return (
              <VisitPass.EmptyState
                icon={Building2}
                title="Aún no hay Apartamentos"
                description="Agrégalos por Torre con rangos como 101-104, 201-204."
                action={
                  <Button onClick={() => setDialogTower('')}>
                    <Plus aria-hidden="true" />
                    Agregar apartamentos
                  </Button>
                }
              />
            );

          // The backend sends tower-then-number order; one entry per Torre.
          const apartmentsByTower = new Map<
            string,
            Array<AdminRouteFeat.ApartmentSummary>
          >();
          for (const apartment of value)
            apartmentsByTower.set(apartment.tower, [
              ...(apartmentsByTower.get(apartment.tower) ?? []),
              apartment,
            ]);
          const towers = [...apartmentsByTower].map(
            ([name, towerApartments]) => ({
              name,
              apartments: towerApartments,
              residentCount: towerApartments.reduce(
                (total, apartment) => total + apartment.activeResidentCount,
                0
              ),
            })
          );
          const residentCount = towers.reduce(
            (total, tower) => total + tower.residentCount,
            0
          );

          return (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                {[
                  countOf(towers.length, 'Torre', 'Torres'),
                  countOf(value.length, ...APARTMENT_WORDS),
                  countOf(residentCount, ...RESIDENT_WORDS),
                ].join(' · ')}
              </p>
              {towers.map((tower) => (
                <Card key={tower.name}>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Torre {tower.name}
                    </CardTitle>
                    <CardDescription>
                      {countOf(tower.apartments.length, ...APARTMENT_WORDS)} ·{' '}
                      {countOf(tower.residentCount, ...RESIDENT_WORDS)}
                    </CardDescription>
                    <CardAction>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDialogTower(tower.name)}
                      >
                        <Plus aria-hidden="true" />
                        <span className="hidden sm:inline">
                          Agregar a esta Torre
                        </span>
                        <span className="sm:hidden">Agregar</span>
                      </Button>
                    </CardAction>
                  </CardHeader>
                  <CardContent>
                    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
                      {tower.apartments.map((apartment) => {
                        const hasResidents = apartment.activeResidentCount > 0;

                        return (
                          <li
                            key={apartment._id}
                            title={`${apartment.label}: ${countOf(apartment.activeResidentCount, ...RESIDENT_WORDS)}`}
                            className={cn(
                              'flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-center',
                              hasResidents
                                ? 'bg-card'
                                : 'border-dashed bg-muted/40 text-muted-foreground'
                            )}
                          >
                            <span className="text-sm font-semibold tabular-nums">
                              {apartment.number}
                            </span>
                            <span
                              className={cn(
                                'flex items-center gap-1 text-xs',
                                hasResidents
                                  ? 'text-primary'
                                  : 'text-muted-foreground'
                              )}
                            >
                              <Users className="size-3" aria-hidden="true" />
                              {apartment.activeResidentCount}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        }}
      </AdminRouteFeat.QueryView>

      <AdminRouteFeat.CreateApartmentsDialog
        key={dialogTower ?? ''}
        open={Predicate.isNotNull(dialogTower)}
        onOpenChange={(open) => (open ? undefined : setDialogTower(null))}
        defaultTower={dialogTower ?? ''}
      />
    </>
  );
}
