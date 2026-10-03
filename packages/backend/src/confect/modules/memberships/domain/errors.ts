import * as Schema from 'effect/Schema';

import { Role } from './roles';

/** The access token names no Unidad residencial this deployment knows. */
export class NoActiveResidentialUnitError extends Schema.TaggedError<NoActiveResidentialUnitError>()(
  'Memberships/NoActiveResidentialUnitError',
  {}
) {}

/** The caller has no active Membresía in the unit their token names. */
export class MembershipRequiredError extends Schema.TaggedError<MembershipRequiredError>()(
  'Memberships/MembershipRequiredError',
  {}
) {}

export class RoleRequiredError extends Schema.TaggedError<RoleRequiredError>()(
  'Memberships/RoleRequiredError',
  {
    role: Role,
  }
) {}

/** Also answers for a Membresía of another Unidad residencial, so ids never leak across units. */
export class MembershipNotFoundError extends Schema.TaggedError<MembershipNotFoundError>()(
  'Memberships/MembershipNotFoundError',
  {}
) {}

/** A Residente needs an Apartamento and a Tipo de ocupación; no other Rol takes them. */
export class InvalidResidentAssignmentError extends Schema.TaggedError<InvalidResidentAssignmentError>()(
  'Memberships/InvalidResidentAssignmentError',
  {}
) {}

/** The email already holds a pending or active Membresía with this Rol and Apartamento. */
export class DuplicateMembershipError extends Schema.TaggedError<DuplicateMembershipError>()(
  'Memberships/DuplicateMembershipError',
  {}
) {}

/**
 * Answers every Invitación the session cannot act on, including one sent to
 * another email, so its existence is never revealed.
 */
export class InvitationNotFoundError extends Schema.TaggedError<InvitationNotFoundError>()(
  'Memberships/InvitationNotFoundError',
  {}
) {}

export class InvitationExpiredError extends Schema.TaggedError<InvitationExpiredError>()(
  'Memberships/InvitationExpiredError',
  {}
) {}

export class EmailNotVerifiedError extends Schema.TaggedError<EmailNotVerifiedError>()(
  'Memberships/EmailNotVerifiedError',
  {}
) {}

export class CannotRevokeOwnMembershipError extends Schema.TaggedError<CannotRevokeOwnMembershipError>()(
  'Memberships/CannotRevokeOwnMembershipError',
  {}
) {}
