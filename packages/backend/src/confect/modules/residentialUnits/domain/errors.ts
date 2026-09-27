import * as Schema from 'effect/Schema';

export class ApartmentNotFoundError extends Schema.TaggedError<ApartmentNotFoundError>()(
  'ResidentialUnits/ApartmentNotFoundError',
  {}
) {}

/** The unit would exceed the Apartamentos every listing can read at once. */
export class ApartmentLimitReachedError extends Schema.TaggedError<ApartmentLimitReachedError>()(
  'ResidentialUnits/ApartmentLimitReachedError',
  { limit: Schema.Finite }
) {}

export class NotSuperadminError extends Schema.TaggedError<NotSuperadminError>()(
  'ResidentialUnits/NotSuperadminError',
  {}
) {}

export class ResidentialUnitNotFoundError extends Schema.TaggedError<ResidentialUnitNotFoundError>()(
  'ResidentialUnits/ResidentialUnitNotFoundError',
  {}
) {}
