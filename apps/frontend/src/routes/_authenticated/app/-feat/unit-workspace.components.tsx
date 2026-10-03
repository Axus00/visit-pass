import * as Predicate from 'effect/Predicate';

import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/ui';

import { ApartmentsPanel } from './apartments-panel.components';
import { MembershipsPanel } from './memberships-panel.components';
import {
  type AccessibleUnit,
  type ResidentialUnitId,
  formatRoleWithApartment,
} from './unit-access.models';

/** The active Unidad residencial: who the Usuario is there and what their Rol manages. */
export function UnitWorkspace({
  unit,
  units,
  enteringUnitId,
  onEnterUnit,
  now,
}: {
  unit: AccessibleUnit;
  units: ReadonlyArray<AccessibleUnit>;
  enteringUnitId: ResidentialUnitId | null;
  onEnterUnit: (residentialUnitId: ResidentialUnitId) => void;
  now: number;
}) {
  const { residentialUnit, memberships } = unit;
  const otherUnits = units.filter(
    (candidate) => candidate.residentialUnit._id !== residentialUnit._id
  );
  const hasOtherUnits = otherUnits.length > 0;
  const isSwitching = Predicate.isNotNull(enteringUnitId);
  const isAdministrator = memberships.some(
    (membership) => membership.role === 'administrator'
  );

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="text-lg font-semibold tracking-tight">
            {residentialUnit.name}
          </h2>
          <ul className="flex flex-wrap gap-1.5" aria-label="Tus Roles">
            {memberships.map((membership) => (
              <li key={membership._id}>
                <Badge variant="secondary">
                  {formatRoleWithApartment(
                    membership,
                    residentialUnit.groupingWord
                  )}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
        {hasOtherUnits ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm" disabled={isSwitching} />
              }
            >
              {isSwitching ? 'Entrando…' : 'Cambiar de Unidad residencial'}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              <DropdownMenuGroup>
                {otherUnits.map((otherUnit) => (
                  <DropdownMenuItem
                    key={otherUnit.residentialUnit._id}
                    onClick={() => onEnterUnit(otherUnit.residentialUnit._id)}
                  >
                    {otherUnit.residentialUnit.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      {isAdministrator ? (
        <Tabs defaultValue="memberships">
          <TabsList>
            <TabsTrigger value="memberships">Membresías</TabsTrigger>
            <TabsTrigger value="apartments">Apartamentos</TabsTrigger>
          </TabsList>
          <TabsContent value="memberships">
            <MembershipsPanel
              groupingWord={residentialUnit.groupingWord}
              ownMembershipIds={memberships.map((membership) => membership._id)}
              now={now}
            />
          </TabsContent>
          <TabsContent value="apartments">
            <ApartmentsPanel groupingWord={residentialUnit.groupingWord} />
          </TabsContent>
        </Tabs>
      ) : (
        <p className="text-sm text-muted-foreground">
          Todavía no hay funciones disponibles para tu Rol en esta Unidad
          residencial.
        </p>
      )}
    </section>
  );
}
