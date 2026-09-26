import * as Schema from 'effect/Schema';

/**
 * The Membresía is not the caller's, is not active, or its Rol cannot run the
 * function. One tag for all three so callers learn nothing about other units.
 */
export class AccessDeniedError extends Schema.TaggedError<AccessDeniedError>()(
  'Memberships/AccessDeniedError',
  {}
) {}

export class MembershipAlreadyExistsError extends Schema.TaggedError<MembershipAlreadyExistsError>()(
  'Memberships/MembershipAlreadyExistsError',
  { email: Schema.String }
) {}

/** A Residente needs an Apartamento and a Tipo de ocupación; other Roles take neither. */
export class InvalidMembershipError extends Schema.TaggedError<InvalidMembershipError>()(
  'Memberships/InvalidMembershipError',
  {
    reason: Schema.Literals([
      'residentNeedsApartment',
      'onlyResidentsHaveApartment',
      'invalidEmail',
    ]),
  }
) {}

export class MembershipNotFoundError extends Schema.TaggedError<MembershipNotFoundError>()(
  'Memberships/MembershipNotFoundError',
  {}
) {}

/** An Administrador cannot revoke their own Membresía and lock the unit out. */
export class CannotRevokeOwnMembershipError extends Schema.TaggedError<CannotRevokeOwnMembershipError>()(
  'Memberships/CannotRevokeOwnMembershipError',
  {}
) {}
