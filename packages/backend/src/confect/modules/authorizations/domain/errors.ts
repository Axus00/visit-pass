import * as Schema from 'effect/Schema';

export const InvalidAuthorizationReason = Schema.Literals([
  /** The first valid day is before today in the unit's time zone. */
  'startsInThePast',
  'endBeforeStart',
  'rangeTooLong',
  'missingEndDate',
  'missingWeekdays',
  /** No day between the start and end dates falls on an allowed weekday. */
  'noAllowedDayInRange',
  /** Temporal and Servicio take exactly one Visitante. */
  'singleVisitorRequired',
]);

export type InvalidAuthorizationReason = typeof InvalidAuthorizationReason.Type;

export class InvalidAuthorizationError extends Schema.TaggedError<InvalidAuthorizationError>()(
  'Authorizations/InvalidAuthorizationError',
  { reason: InvalidAuthorizationReason }
) {}

export class AuthorizationNotFoundError extends Schema.TaggedError<AuthorizationNotFoundError>()(
  'Authorizations/AuthorizationNotFoundError',
  {}
) {}

export class PassNotFoundError extends Schema.TaggedError<PassNotFoundError>()(
  'Authorizations/PassNotFoundError',
  {}
) {}

/** Only an active Pase of an active Autorización can be regenerated. */
export class PassNotActiveError extends Schema.TaggedError<PassNotActiveError>()(
  'Authorizations/PassNotActiveError',
  {}
) {}

export class FavoriteNotFoundError extends Schema.TaggedError<FavoriteNotFoundError>()(
  'Authorizations/FavoriteNotFoundError',
  {}
) {}
