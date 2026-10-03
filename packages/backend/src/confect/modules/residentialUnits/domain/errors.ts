import * as Schema from 'effect/Schema';

export class SlugTakenError extends Schema.TaggedError<SlugTakenError>()(
  'ResidentialUnits/SlugTakenError',
  {
    slug: Schema.String,
  }
) {}
