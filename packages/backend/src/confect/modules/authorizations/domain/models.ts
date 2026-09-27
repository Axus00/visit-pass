import * as SystemFields from '@confect/core/SystemFields';
import * as Schema from 'effect/Schema';

import { Id } from '../../../_generated/id';
import * as CalendarDomain from '../../calendar/domain';

export const VISITOR_NAME_MAX_LENGTH = 120;
export const VISITOR_DOCUMENT_MAX_LENGTH = 30;
export const EVENT_NAME_MAX_LENGTH = 80;
export const MAX_EVENT_VISITORS = 100;
/**
 * Bound for reading one Autorización's Pases newest first: an Evento's guest
 * list plus room for regenerated ones, so the live Pases are the part kept.
 */
export const PASSES_PER_AUTHORIZATION_LIMIT = 2 * MAX_EVENT_VISITORS;
/** A Servicio spans at most this many days. */
export const MAX_SERVICE_DAYS = 366;

/**
 * Temporal: one Visitante, one day, one Ingreso. Evento: a guest list for one
 * day, one Pase and one Ingreso each. Servicio: one Visitante over a date range
 * on chosen weekdays, several Ingresos per allowed day.
 */
export const AuthorizationType = Schema.Literals([
  'temporary',
  'event',
  'service',
]);

export type AuthorizationType = typeof AuthorizationType.Type;

export const AuthorizationStatus = Schema.Literals(['active', 'cancelled']);

export type AuthorizationStatus = typeof AuthorizationStatus.Type;

export const VisitorName = Schema.Trim.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(VISITOR_NAME_MAX_LENGTH)
);

export const VisitorDocument = Schema.Trim.check(
  Schema.isMinLength(3),
  Schema.isMaxLength(VISITOR_DOCUMENT_MAX_LENGTH)
);

/** Belongs to the Apartamento: every active Residente there sees and cancels it. */
export const AuthorizationsTableSchema = Schema.Struct({
  residentialUnitId: Id('residentialUnits'),
  apartmentId: Id('apartments'),
  createdByMembershipId: Id('memberships'),
  type: AuthorizationType,
  /** Equals `endDate` for Temporal and Evento. */
  startDate: CalendarDomain.LocalDate,
  endDate: CalendarDomain.LocalDate,
  /** Allowed weekdays for Servicio; every weekday otherwise. */
  weekdays: Schema.Array(CalendarDomain.Weekday),
  eventName: Schema.optional(Schema.String),
  status: AuthorizationStatus,
  cancelledAt: Schema.optional(Schema.Finite),
  cancelledByMembershipId: Schema.optional(Id('memberships')),
});

export type Authorization = typeof AuthorizationsTableSchema.Type;

export const AuthorizationsDocSchema = SystemFields.extendWithSystemFields(
  'authorizations',
  AuthorizationsTableSchema
);

/**
 * `used` is terminal for Temporal and Evento Pases after their Ingreso;
 * Servicio Pases stay `active` across Ingresos. `replaced` marks a Pase whose
 * regeneration issued a new one, so its old QR is rejected with that reason.
 */
export const PassStatus = Schema.Literals([
  'active',
  'used',
  'cancelled',
  'replaced',
]);

export type PassStatus = typeof PassStatus.Type;

export const PassesTableSchema = Schema.Struct({
  authorizationId: Id('authorizations'),
  residentialUnitId: Id('residentialUnits'),
  apartmentId: Id('apartments'),
  visitorName: Schema.String,
  visitorDocument: Schema.optional(Schema.String),
  /** Opaque 128-bit base64url identifier the QR encodes; rotated on regenerate. */
  token: Schema.String,
  status: PassStatus,
  entryCount: Schema.Finite,
  lastEntryAt: Schema.optional(Schema.Finite),
  favoriteId: Schema.optional(Id('favorites')),
  /** The Pase issued when this one was regenerated. */
  replacedByPassId: Schema.optional(Id('passes')),
});

export type Pass = typeof PassesTableSchema.Type;

export const PassesDocSchema = SystemFields.extendWithSystemFields(
  'passes',
  PassesTableSchema
);

export const Relationship = Schema.Literals(['family', 'friend', 'other']);

export type Relationship = typeof Relationship.Type;

/** A Visitante a Residente saved to authorize with one tap. */
export const FavoritesTableSchema = Schema.Struct({
  residentialUnitId: Id('residentialUnits'),
  membershipId: Id('memberships'),
  visitorName: Schema.String,
  visitorDocument: Schema.optional(Schema.String),
  relationship: Relationship,
  relationshipNote: Schema.optional(Schema.String),
  lastAuthorizedAt: Schema.optional(Schema.Finite),
});

export const FavoritesDocSchema = SystemFields.extendWithSystemFields(
  'favorites',
  FavoritesTableSchema
);

// -*******************************************************************************-
// Payloads and projections
// -*******************************************************************************-

export const AuthorizationVisitorInput = Schema.Struct({
  name: VisitorName,
  document: Schema.optional(VisitorDocument),
  favoriteId: Schema.optional(Id('favorites')),
});

export type AuthorizationVisitorInput = typeof AuthorizationVisitorInput.Type;

export const CreateAuthorizationDto = Schema.Struct({
  type: AuthorizationType,
  startDate: CalendarDomain.LocalDate,
  /** Required for Servicio; ignored otherwise. */
  endDate: Schema.optional(CalendarDomain.LocalDate),
  /** Required for Servicio; ignored otherwise. */
  weekdays: Schema.optional(Schema.Array(CalendarDomain.Weekday)),
  eventName: Schema.optional(
    Schema.Trim.check(
      Schema.isMinLength(1),
      Schema.isMaxLength(EVENT_NAME_MAX_LENGTH)
    )
  ),
  visitors: Schema.Array(AuthorizationVisitorInput).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(MAX_EVENT_VISITORS)
  ),
});

export type CreateAuthorizationDto = typeof CreateAuthorizationDto.Type;

export const PassSummary = Schema.Struct({
  _id: Id('passes'),
  token: Schema.String,
  visitorName: Schema.String,
  visitorDocument: Schema.optional(Schema.String),
  status: PassStatus,
  entryCount: Schema.Finite,
  lastEntryAt: Schema.optional(Schema.Finite),
});

export type PassSummary = typeof PassSummary.Type;

export const CreatedAuthorization = Schema.Struct({
  authorizationId: Id('authorizations'),
  passes: Schema.Array(PassSummary),
});

export type CreatedAuthorization = typeof CreatedAuthorization.Type;

export const AuthorizationSummary = Schema.Struct({
  _id: Id('authorizations'),
  _creationTime: Schema.Finite,
  type: AuthorizationType,
  startDate: CalendarDomain.LocalDate,
  endDate: CalendarDomain.LocalDate,
  weekdays: Schema.Array(CalendarDomain.Weekday),
  eventName: Schema.optional(Schema.String),
  status: AuthorizationStatus,
  createdByName: Schema.optional(Schema.String),
  passes: Schema.Array(PassSummary),
});

export type AuthorizationSummary = typeof AuthorizationSummary.Type;

/** What anyone holding the link to a Pase sees, without a session. */
export const PublicPass = Schema.Struct({
  token: Schema.String,
  visitorName: Schema.String,
  residentialUnitName: Schema.String,
  /** Decides which calendar day is "today" when showing the Pase's state. */
  residentialUnitTimeZone: Schema.String,
  apartmentLabel: Schema.String,
  type: AuthorizationType,
  startDate: CalendarDomain.LocalDate,
  endDate: CalendarDomain.LocalDate,
  weekdays: Schema.Array(CalendarDomain.Weekday),
  eventName: Schema.optional(Schema.String),
  status: PassStatus,
  authorizationStatus: AuthorizationStatus,
});

export type PublicPass = typeof PublicPass.Type;

export const FavoriteSummary = Schema.Struct({
  _id: Id('favorites'),
  visitorName: Schema.String,
  visitorDocument: Schema.optional(Schema.String),
  relationship: Relationship,
  relationshipNote: Schema.optional(Schema.String),
  lastAuthorizedAt: Schema.optional(Schema.Finite),
});

export type FavoriteSummary = typeof FavoriteSummary.Type;

export const CreateFavoriteDto = Schema.Struct({
  visitorName: VisitorName,
  visitorDocument: Schema.optional(VisitorDocument),
  relationship: Relationship,
  relationshipNote: Schema.optional(
    Schema.Trim.check(Schema.isMinLength(1), Schema.isMaxLength(60))
  ),
});

export type CreateFavoriteDto = typeof CreateFavoriteDto.Type;
