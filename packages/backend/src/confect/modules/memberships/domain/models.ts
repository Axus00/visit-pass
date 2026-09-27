import * as SystemFields from '@confect/core/SystemFields';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { Id } from '../../../_generated/id';

export const Role = Schema.Literals(['resident', 'porter', 'administrator']);

export type Role = typeof Role.Type;

/** Propietario or arrendatario; it never changes a Residente's permissions. */
export const OccupancyType = Schema.Literals(['owner', 'tenant']);

export type OccupancyType = typeof OccupancyType.Type;

/**
 * `pending` waits for a Usuario to sign in with `email`; `revoked` keeps the
 * row so past Visitas still name who registered them.
 */
export const MembershipStatus = Schema.Literals([
  'pending',
  'active',
  'revoked',
]);

export type MembershipStatus = typeof MembershipStatus.Type;

export const MembershipsTableSchema = Schema.Struct({
  residentialUnitId: Id('residentialUnits'),
  /** Normalized; matched against the Usuario's sign-in email to activate. */
  email: Schema.String,
  /** Name the Administrador typed, shown until the Usuario signs in. */
  displayName: Schema.optional(Schema.String),
  userId: Schema.optional(Id('users')),
  role: Role,
  /** Set for, and only for, Residentes. */
  apartmentId: Schema.optional(Id('apartments')),
  occupancyType: Schema.optional(OccupancyType),
  status: MembershipStatus,
  activatedAt: Schema.optional(Schema.Finite),
  revokedAt: Schema.optional(Schema.Finite),
});

export type Membership = typeof MembershipsTableSchema.Type;

export const MembershipsDocSchema = SystemFields.extendWithSystemFields(
  'memberships',
  MembershipsTableSchema
);

// -*******************************************************************************-
// Payloads and projections
// -*******************************************************************************-

/** One entry of the caller's Membresías, enough to route to its panel. */
export const MembershipSummary = Schema.Struct({
  membershipId: Id('memberships'),
  ...Struct.pick(MembershipsTableSchema.fields, [
    'role',
    'residentialUnitId',
    'apartmentId',
    'occupancyType',
  ]),
  residentialUnitName: Schema.String,
  residentialUnitTimeZone: Schema.String,
  apartmentLabel: Schema.optional(Schema.String),
});

export type MembershipSummary = typeof MembershipSummary.Type;

export const MyAccess = Schema.Struct({
  memberships: Schema.Array(MembershipSummary),
  isSuperadmin: Schema.Boolean,
});

export type MyAccess = typeof MyAccess.Type;

/** A Membresía as the Administrador manages it. */
export const MembershipDetail = Schema.Struct({
  ...Struct.pick(MembershipsDocSchema.fields, [
    '_id',
    '_creationTime',
    'email',
    'role',
    'status',
    'apartmentId',
    'occupancyType',
    'activatedAt',
  ]),
  /** The signed-in Usuario's name, else the name the Administrador typed. */
  name: Schema.optional(Schema.String),
  apartmentLabel: Schema.optional(Schema.String),
});

export type MembershipDetail = typeof MembershipDetail.Type;

export const InviteMemberDto = Schema.Struct({
  email: Schema.Trim.check(Schema.isMinLength(3), Schema.isMaxLength(254)),
  displayName: Schema.optional(
    Schema.Trim.check(Schema.isMinLength(1), Schema.isMaxLength(120))
  ),
  role: Role,
  apartmentId: Schema.optional(Id('apartments')),
  occupancyType: Schema.optional(OccupancyType),
});

export type InviteMemberDto = typeof InviteMemberDto.Type;
