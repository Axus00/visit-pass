import type * as VisitPass from '#modules/visit-pass';

/** The panel each Rol lands on inside `/app/m/$membershipId`. */
export const ROLE_HOME_PATH = {
  resident: '/app/m/$membershipId/residente',
  porter: '/app/m/$membershipId/porteria',
  administrator: '/app/m/$membershipId/admin',
} as const satisfies Record<VisitPass.Role, string>;
