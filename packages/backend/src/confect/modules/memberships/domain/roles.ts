import * as Schema from 'effect/Schema';

export const ROLES = ['resident', 'gatekeeper', 'administrator'] as const;

export const Role = Schema.Literals(ROLES);

export type Role = typeof Role.Type;

/** The WorkOS environment role that mirrors each Rol (ADR 0008). */
export const EXTERNAL_ROLE_SLUGS = {
  resident: 'residente',
  gatekeeper: 'portero',
  administrator: 'administrador',
} as const satisfies Record<Role, string>;

/**
 * The slugs WorkOS should hold for a set of Roles, widest Rol first: an
 * environment without Multiple Roles keeps only the first one.
 */
export const toExternalRoleSlugs = (
  roles: ReadonlyArray<Role>
): ReadonlyArray<string> =>
  (['administrator', 'gatekeeper', 'resident'] as const)
    .filter((role) => roles.includes(role))
    .map((role) => EXTERNAL_ROLE_SLUGS[role]);

export const OCCUPANCY_TYPES = ['owner', 'tenant'] as const;

export const OccupancyType = Schema.Literals(OCCUPANCY_TYPES);

export type OccupancyType = typeof OccupancyType.Type;
