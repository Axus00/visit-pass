import * as Schema from 'effect/Schema';

/** Also answers for an Apartamento of another Unidad residencial, so ids never leak across units. */
export class ApartmentNotFoundError extends Schema.TaggedError<ApartmentNotFoundError>()(
  'Apartments/ApartmentNotFoundError',
  {}
) {}

export class DuplicateApartmentError extends Schema.TaggedError<DuplicateApartmentError>()(
  'Apartments/DuplicateApartmentError',
  {}
) {}

/** Revoke or withdraw its Membresías before removing the Apartamento. */
export class ApartmentInUseError extends Schema.TaggedError<ApartmentInUseError>()(
  'Apartments/ApartmentInUseError',
  {}
) {}
