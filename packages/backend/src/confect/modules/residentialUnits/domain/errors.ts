import * as Schema from 'effect/Schema';

export class ApartmentNotFoundError extends Schema.TaggedError<ApartmentNotFoundError>()(
  'ResidentialUnits/ApartmentNotFoundError',
  {}
) {}

export class NotSuperadminError extends Schema.TaggedError<NotSuperadminError>()(
  'ResidentialUnits/NotSuperadminError',
  {}
) {}
