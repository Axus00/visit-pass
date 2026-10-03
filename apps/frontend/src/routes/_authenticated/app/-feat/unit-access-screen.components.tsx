import { useCallback, useEffect, useRef, useState } from 'react';

import { QueryResult, useAction, useQuery } from '@confect/react';
import { useAuth } from '@workos-inc/authkit-react';
import * as Clock from 'effect/Clock';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';
import * as Result from 'effect/Result';
import * as Schedule from 'effect/Schedule';

import refs from '@repo/backend/refs';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  toast,
} from '@repo/ui';

import { PendingInvitations } from './pending-invitations.components';
import {
  type AccessibleUnit,
  type MyAccess,
  type ResidentialUnitId,
  formatUnitAccessError,
} from './unit-access.models';
import { UnitWorkspace } from './unit-workspace.components';

const CLOCK_REFRESH = Duration.minutes(1);

/**
 * The whole `/app` page body: answers Invitaciones, picks the active Unidad
 * residencial and shows what the signed-in Usuario can do there.
 */
export function UnitAccessScreen() {
  const access = useQuery(refs.public.memberships.myAccess, {});

  if (QueryResult.isFailure(access))
    return (
      <p className="text-sm text-destructive" role="alert">
        {formatUnitAccessError(access.error)}
      </p>
    );

  if (!QueryResult.isSuccess(access))
    return <Skeleton className="h-32 w-full" />;

  if (Predicate.isNull(access.value))
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Sincronizando tu cuenta…
      </p>
    );

  return <UnitAccess access={access.value} />;
}

function UnitAccess({ access }: { access: MyAccess }) {
  const { organizationId, switchToOrganization } = useAuth();
  const ensureUnitAccess = useAction(refs.public.memberships.ensureUnitAccess);
  const [enteringUnitId, setEnteringUnitId] =
    useState<ResidentialUnitId | null>(null);
  const hasAutoEntered = useRef(false);

  // Invitaciones caducan by date, so the screen re-reads the clock as it stays open.
  const [now, setNow] = useState(() => Effect.runSync(Clock.currentTimeMillis));
  useEffect(() => {
    const stopClock = Effect.runCallback(
      Clock.currentTimeMillis.pipe(
        Effect.tap((millis) => Effect.sync(() => setNow(millis))),
        Effect.repeat(Schedule.spaced(CLOCK_REFRESH))
      )
    );

    return () => stopClock();
  }, []);

  /** WorkOS must mirror the local Membresías before the session switches to the unit. */
  const enterUnit = useCallback(
    (residentialUnitId: ResidentialUnitId) => {
      setEnteringUnitId(residentialUnitId);

      return ensureUnitAccess({ residentialUnitId })
        .then(async (result) => {
          if (Result.isFailure(result)) {
            toast.error(formatUnitAccessError(result.failure));
            return;
          }

          await switchToOrganization({ organizationId: result.success });
        })
        .catch(() => {
          toast.error(
            'No pudimos entrar a la Unidad residencial. Inténtalo de nuevo.'
          );
        })
        .finally(() => setEnteringUnitId(null));
    },
    [ensureUnitAccess, switchToOrganization]
  );

  const activeUnit = access.units.find(
    (unit) => unit.residentialUnit.externalOrganizationId === organizationId
  );
  const hasActiveUnit = Predicate.isNotUndefined(activeUnit);
  const hasSingleUnit = access.units.length === 1;
  const autoEnterUnitId =
    !hasActiveUnit && hasSingleUnit
      ? access.units[0]?.residentialUnit._id
      : undefined;

  // The ref outlives re-renders, so a failed entry falls back to the chooser instead of looping.
  useEffect(() => {
    if (Predicate.isUndefined(autoEnterUnitId) || hasAutoEntered.current)
      return;

    hasAutoEntered.current = true;
    void enterUnit(autoEnterUnitId);
  }, [autoEnterUnitId, enterUnit]);

  const hasInvitations = access.pendingInvitations.length > 0;
  const hasUnits = access.units.length > 0;
  const invitations = hasInvitations ? (
    <PendingInvitations invitations={access.pendingInvitations} now={now} />
  ) : null;

  if (!hasUnits && hasInvitations) return invitations;

  if (!hasUnits) return <NoResidentialUnits email={access.email} />;

  if (!hasActiveUnit)
    return (
      <>
        {invitations}
        <UnitChooser
          units={access.units}
          enteringUnitId={enteringUnitId}
          onEnterUnit={enterUnit}
        />
      </>
    );

  return (
    <>
      {invitations}
      <UnitWorkspace
        key={activeUnit.residentialUnit._id}
        unit={activeUnit}
        units={access.units}
        enteringUnitId={enteringUnitId}
        onEnterUnit={enterUnit}
        now={now}
      />
    </>
  );
}

/** Names only the session's own email: it never hints at Invitaciones sent elsewhere. */
function NoResidentialUnits({ email }: { email: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sin Unidades residenciales</CardTitle>
        <CardDescription>
          Iniciaste sesión como{' '}
          <span className="font-medium break-all text-foreground">{email}</span>
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Inicia sesión con el correo con el que te invitaron, o pide tu
        Invitación a la administración de tu Unidad residencial.
      </CardContent>
    </Card>
  );
}

function UnitChooser({
  units,
  enteringUnitId,
  onEnterUnit,
}: {
  units: ReadonlyArray<AccessibleUnit>;
  enteringUnitId: ResidentialUnitId | null;
  onEnterUnit: (residentialUnitId: ResidentialUnitId) => void;
}) {
  const isEntering = Predicate.isNotNull(enteringUnitId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tus Unidades residenciales</CardTitle>
        <CardDescription>Elige a cuál quieres entrar.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y rounded-md border">
          {units.map(({ residentialUnit }) => (
            <li
              key={residentialUnit._id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <span className="min-w-0 truncate text-sm font-medium">
                {residentialUnit.name}
              </span>
              <Button
                size="sm"
                disabled={isEntering}
                onClick={() => onEnterUnit(residentialUnit._id)}
              >
                {enteringUnitId === residentialUnit._id
                  ? 'Entrando…'
                  : 'Entrar'}
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
