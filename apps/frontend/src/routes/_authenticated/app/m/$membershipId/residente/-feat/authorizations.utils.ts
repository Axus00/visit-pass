import type * as VisitPass from '#modules/visit-pass';

export type AuthorizationTab = 'current' | 'past' | 'cancelled';

export const AUTHORIZATION_TAB_LABELS = {
  current: 'Vigentes',
  past: 'Pasadas',
  cancelled: 'Canceladas',
} as const satisfies Record<AuthorizationTab, string>;

/** Vigente until its last day ends in the unit's time zone, unless cancelled. */
export function classifyAuthorization(
  authorization: Pick<VisitPass.AuthorizationSummary, 'status' | 'endDate'>,
  today: string
): AuthorizationTab {
  if (authorization.status === 'cancelled') return 'cancelled';
  if (authorization.endDate < today) return 'past';

  return 'current';
}

/** Splits out Pases replaced by a regenerated one, which no longer work. */
export function partitionReplacedPasses<
  Pass extends Pick<VisitPass.AuthorizationSummary['passes'][number], 'status'>,
>(passes: ReadonlyArray<Pass>) {
  return {
    live: passes.filter((pass) => pass.status !== 'replaced'),
    replaced: passes.filter((pass) => pass.status === 'replaced'),
  };
}

export function formatEntryCount(entryCount: number) {
  if (entryCount === 0) return 'Sin ingresos';
  if (entryCount === 1) return '1 ingreso';

  return `${entryCount} ingresos`;
}

export const PASS_STATUS_BADGE_VARIANT = {
  active: 'success',
  used: 'secondary',
  cancelled: 'destructive',
  replaced: 'outline',
} as const satisfies Record<VisitPass.PassStatus, string>;

export const AUTHORIZATION_TABS: ReadonlyArray<AuthorizationTab> = [
  'current',
  'past',
  'cancelled',
];

/**
 * Splits Autorizaciones into their tabs: Vigentes soonest first, Pasadas and
 * Canceladas most recent first.
 */
export function groupAuthorizationsByTab<
  Authorization extends Pick<
    VisitPass.AuthorizationSummary,
    'status' | 'startDate' | 'endDate' | '_creationTime'
  >,
>(
  authorizations: ReadonlyArray<Authorization>,
  today: string
): Record<AuthorizationTab, ReadonlyArray<Authorization>> {
  const inTab = (tab: AuthorizationTab) =>
    authorizations.filter(
      (authorization) => classifyAuthorization(authorization, today) === tab
    );

  return {
    current: inTab('current').sort(
      (a, b) =>
        a.startDate.localeCompare(b.startDate) ||
        b._creationTime - a._creationTime
    ),
    past: inTab('past').sort((a, b) => b.endDate.localeCompare(a.endDate)),
    cancelled: inTab('cancelled').sort(
      (a, b) => b._creationTime - a._creationTime
    ),
  };
}
