import * as SystemFields from '@confect/core/SystemFields';
import * as Schema from 'effect/Schema';

import { Id } from '../../../_generated/id';
import * as AuthorizationsDomain from '../../authorizations/domain';

export const PLATE_MAX_LENGTH = 12;

/** How many of an Apartamento's latest Visitas the Residente's history lists. */
export const APARTMENT_HISTORY_LIMIT = 50;

/** Temporal, Evento or Servicio; inherited from the Autorización on a Pase. */
export const VisitType = AuthorizationsDomain.AuthorizationType;

export type VisitType = typeof VisitType.Type;

export const VisitOrigin = Schema.Literals(['pass', 'manual']);

export type VisitOrigin = typeof VisitOrigin.Type;

export const VisitsTableSchema = Schema.Struct({
  residentialUnitId: Id('residentialUnits'),
  apartmentId: Id('apartments'),
  /** Replaced by a placeholder once the retention period anonymizes it. */
  visitorName: Schema.String,
  visitorDocument: Schema.optional(Schema.String),
  plate: Schema.optional(Schema.String),
  visitType: VisitType,
  origin: VisitOrigin,
  passId: Schema.optional(Id('passes')),
  authorizationId: Schema.optional(Id('authorizations')),
  /** A Registro manual forced after the Portero saw this rejection. */
  overriddenRejection: Schema.optional(
    AuthorizationsDomain.PassRejectionReason
  ),
  shiftId: Id('shifts'),
  entryPorterMembershipId: Id('memberships'),
  enteredAt: Schema.Finite,
  exitedAt: Schema.optional(Schema.Finite),
  exitPorterMembershipId: Schema.optional(Id('memberships')),
  /** Aviso de privacidad shown when the Visitante handed over the data. */
  privacyNoticeVersion: Schema.String,
  anonymizedAt: Schema.optional(Schema.Finite),
  /** A Visita registered by mistake is voided with a reason, never deleted. */
  voidedAt: Schema.optional(Schema.Finite),
  voidReason: Schema.optional(Schema.String),
  voidedByMembershipId: Schema.optional(Id('memberships')),
});

export type Visit = typeof VisitsTableSchema.Type;

export const VisitsDocSchema = SystemFields.extendWithSystemFields(
  'visits',
  VisitsTableSchema
);

// -*******************************************************************************-
// Payloads and projections
// -*******************************************************************************-

const Plate = Schema.Trim.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(PLATE_MAX_LENGTH)
);

export const RegisterManualEntryDto = Schema.Struct({
  visitorName: AuthorizationsDomain.VisitorName,
  visitorDocument: AuthorizationsDomain.VisitorDocument,
  apartmentId: Id('apartments'),
  visitType: VisitType,
  plate: Schema.optional(Plate),
  /** The Pase the Portero scanned and saw rejected, when forcing its Ingreso. */
  rejectedPassToken: Schema.optional(Schema.String),
});

export type RegisterManualEntryDto = typeof RegisterManualEntryDto.Type;

export const RegisterPassEntryDto = Schema.Struct({
  token: Schema.Trim.check(Schema.isMinLength(1)),
  plate: Schema.optional(Plate),
  /** Completes the Visitante's document when the Residente did not know it. */
  visitorDocument: Schema.optional(AuthorizationsDomain.VisitorDocument),
});

export type RegisterPassEntryDto = typeof RegisterPassEntryDto.Type;

export const VOID_REASON_MAX_LENGTH = 200;

export const VoidVisitDto = Schema.Struct({
  visitId: Id('visits'),
  reason: Schema.Trim.check(
    Schema.isMinLength(3),
    Schema.isMaxLength(VOID_REASON_MAX_LENGTH)
  ),
});

export type VoidVisitDto = typeof VoidVisitDto.Type;

export const VisitSummary = Schema.Struct({
  _id: Id('visits'),
  visitorName: Schema.String,
  /** Masked (`••••1234`) outside portería and administración. */
  visitorDocument: Schema.optional(Schema.String),
  plate: Schema.optional(Schema.String),
  apartmentId: Id('apartments'),
  apartmentLabel: Schema.String,
  visitType: VisitType,
  origin: VisitOrigin,
  overriddenRejection: Schema.optional(
    AuthorizationsDomain.PassRejectionReason
  ),
  enteredAt: Schema.Finite,
  exitedAt: Schema.optional(Schema.Finite),
  entryPorterName: Schema.optional(Schema.String),
  anonymized: Schema.Boolean,
  /** Voided Visitas stay listed but out of counts and reports. */
  voided: Schema.Boolean,
  voidReason: Schema.optional(Schema.String),
});

export type VisitSummary = typeof VisitSummary.Type;

/** The Pase details the Portero checks against the Visitante in front of them. */
export const ResolvedPass = Schema.Struct({
  passId: Id('passes'),
  visitorName: Schema.String,
  visitorDocument: Schema.optional(Schema.String),
  apartmentId: Id('apartments'),
  apartmentLabel: Schema.String,
  type: AuthorizationsDomain.AuthorizationType,
  startDate: Schema.String,
  endDate: Schema.String,
  weekdays: Schema.Array(Schema.Finite),
  eventName: Schema.optional(Schema.String),
  entryCount: Schema.Finite,
});

export type ResolvedPass = typeof ResolvedPass.Type;

export const PassResolution = Schema.Union([
  Schema.Struct({ outcome: Schema.Literal('notFound') }),
  Schema.Struct({
    outcome: Schema.Literal('admissible'),
    pass: ResolvedPass,
  }),
  Schema.Struct({
    outcome: Schema.Literal('rejected'),
    reason: AuthorizationsDomain.PassRejectionReason,
    pass: ResolvedPass,
  }),
]);

export type PassResolution = typeof PassResolution.Type;

export function maskDocument(document: string) {
  const visibleDigits = document.slice(-4);

  return `••••${visibleDigits}`;
}
