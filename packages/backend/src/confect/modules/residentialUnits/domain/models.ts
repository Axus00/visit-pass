import * as SystemFields from '@confect/core/SystemFields';
import * as Schema from 'effect/Schema';

export const NAME_MAX_LENGTH = 80;
export const SLUG_MAX_LENGTH = 60;

export const GROUPING_WORDS = [
  'torre',
  'bloque',
  'interior',
  'manzana',
] as const;

/** The word a Unidad residencial uses for its Agrupaciones; null when it has none. */
export const GroupingWord = Schema.NullOr(Schema.Literals(GROUPING_WORDS));

export type GroupingWord = typeof GroupingWord.Type;

export const ResidentialUnitsTableSchema = Schema.Struct({
  name: Schema.Trim.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(NAME_MAX_LENGTH)
  ),
  /** Unique across the platform and immutable: `/privacidad/<slug>` uses it. */
  slug: Schema.String.check(
    Schema.isPattern(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    Schema.isMaxLength(SLUG_MAX_LENGTH)
  ),
  groupingWord: GroupingWord,
  /** WorkOS Organization id; `org_id` in the access token names the active unit. */
  externalOrganizationId: Schema.String,
});

export const ResidentialUnitsDocSchema = SystemFields.extendWithSystemFields(
  'residentialUnits',
  ResidentialUnitsTableSchema
);

export const UpdateGroupingWordDto = Schema.Struct({
  groupingWord: GroupingWord,
});

export type UpdateGroupingWordDto = typeof UpdateGroupingWordDto.Type;
