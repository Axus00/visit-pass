import * as SystemFields from '@confect/core/SystemFields';
import * as Duration from 'effect/Duration';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { Id } from '../../../_generated/id';
import * as ApartmentsDomain from '../../apartments/domain';
import * as ResidentialUnitsDomain from '../../residentialUnits/domain';
import { OccupancyType, Role } from './roles';

export const NAME_MAX_LENGTH = 80;

export const INVITATION_VALIDITY = Duration.days(30);

/** WorkOS caps an invitation at 30 days, the same life an Invitación has. */
export const INVITATION_VALIDITY_DAYS = 30;

const MemberName = Schema.Trim.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(NAME_MAX_LENGTH)
);

const MemberEmail = Schema.Trim.check(
  Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
);

export const MembershipStatus = Schema.Literals([
  'pending',
  'active',
  'revoked',
  'rejected',
  'withdrawn',
]);

export type MembershipStatus = typeof MembershipStatus.Type;

/** How the last Invitación email fared; `skipped` means the deployment sends no email. */
export const InvitationDelivery = Schema.Literals([
  'sending',
  'sent',
  'skipped',
  'failed',
]);

export type InvitationDelivery = typeof InvitationDelivery.Type;

export const MembershipsTableSchema = Schema.Struct({
  residentialUnitId: Id('residentialUnits'),
  role: Role,
  /** Present exactly when the Rol is Residente. */
  apartmentId: Schema.optional(Id('apartments')),
  occupancyType: Schema.optional(OccupancyType),
  /** The unit's own copy: history names the Membresía, never the Usuario (ADR 0010). */
  name: MemberName,
  /** Normalized like `users.email`, so the two compare exactly. */
  email: Schema.String,
  /** Set when the Usuario accepts; a pending Membresía belongs to an email only. */
  userId: Schema.optional(Id('users')),
  status: MembershipStatus,
  invitedAt: Schema.Finite,
  /** Absent when the platform, not an Administrador, created the Membresía. */
  invitedByMembershipId: Schema.optional(Id('memberships')),
  invitationExpiresAt: Schema.Finite,
  invitationDelivery: InvitationDelivery,
  /** The WorkOS invitation whose link the Invitación embeds, while it is usable. */
  externalInvitationId: Schema.optional(Schema.String),
  acceptedAt: Schema.optional(Schema.Finite),
  rejectedAt: Schema.optional(Schema.Finite),
  withdrawnAt: Schema.optional(Schema.Finite),
  revokedAt: Schema.optional(Schema.Finite),
  revokedByMembershipId: Schema.optional(Id('memberships')),
});

export const MembershipsDocSchema = SystemFields.extendWithSystemFields(
  'memberships',
  MembershipsTableSchema
);

export const InviteMembershipDto = Schema.Struct({
  name: MemberName,
  email: MemberEmail,
  role: Role,
  apartmentId: MembershipsTableSchema.fields.apartmentId,
  occupancyType: MembershipsTableSchema.fields.occupancyType,
});

export type InviteMembershipDto = typeof InviteMembershipDto.Type;

export const UpdateOccupancyTypeDto = Schema.Struct({
  membershipId: Id('memberships'),
  occupancyType: OccupancyType,
});

export type UpdateOccupancyTypeDto = typeof UpdateOccupancyTypeDto.Type;

/** A Membresía as the Administrador's list shows it. */
export const MembershipSummary = Schema.Struct({
  ...Struct.pick(MembershipsDocSchema.fields, [
    '_id',
    'role',
    'occupancyType',
    'name',
    'email',
    'status',
    'invitedAt',
    'invitationExpiresAt',
    'invitationDelivery',
    'acceptedAt',
    'revokedAt',
  ]),
  apartment: Schema.NullOr(ApartmentsDomain.ApartmentLabel),
});

export type MembershipSummary = typeof MembershipSummary.Type;

const UnitSummary = ResidentialUnitsDomain.ResidentialUnitsDocSchema;

const OwnMembership = Schema.Struct({
  _id: Id('memberships'),
  role: Role,
  apartment: Schema.NullOr(ApartmentsDomain.ApartmentLabel),
});

/** A Membresía pendiente as the invited person sees it before answering. */
export const PendingInvitation = Schema.Struct({
  ...OwnMembership.fields,
  residentialUnit: Schema.Struct({
    name: UnitSummary.fields.name,
    groupingWord: UnitSummary.fields.groupingWord,
  }),
  invitationExpiresAt: Schema.Finite,
});

export type PendingInvitation = typeof PendingInvitation.Type;

/** Everything the signed-in Usuario can enter or answer, across Unidades residenciales. */
export const MyAccess = Schema.Struct({
  email: Schema.String,
  units: Schema.Array(
    Schema.Struct({
      residentialUnit: UnitSummary,
      memberships: Schema.Array(OwnMembership),
    })
  ),
  pendingInvitations: Schema.Array(PendingInvitation),
});

export type MyAccess = typeof MyAccess.Type;

/** What `syncUnitAccess` needs to reconcile WorkOS with the local Membresías. */
export const UnitAccessTarget = Schema.Struct({
  externalUserId: Schema.String,
  externalOrganizationId: Schema.String,
  roles: Schema.Array(Role),
  hasPendingInvitation: Schema.Boolean,
});

export type UnitAccessTarget = typeof UnitAccessTarget.Type;

/** What the delivery workflow hands to the email step. */
export const InvitationEmail = Schema.Struct({
  to: Schema.String,
  subject: Schema.String,
  html: Schema.String,
  text: Schema.String,
});

export type InvitationEmail = typeof InvitationEmail.Type;

export const InvitationDeliveryOutcome = Schema.Literals([
  'sent',
  'skipped',
  'failed',
]);

export type InvitationDeliveryOutcome = typeof InvitationDeliveryOutcome.Type;
