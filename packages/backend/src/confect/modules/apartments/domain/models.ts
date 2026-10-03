import * as SystemFields from '@confect/core/SystemFields';
import * as Schema from 'effect/Schema';

import { Id } from '../../../_generated/id';

export const GROUPING_MAX_LENGTH = 20;
export const NUMBER_MAX_LENGTH = 20;

const Grouping = Schema.Trim.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(GROUPING_MAX_LENGTH)
);

const ApartmentNumber = Schema.Trim.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(NUMBER_MAX_LENGTH)
);

export const ApartmentsTableSchema = Schema.Struct({
  residentialUnitId: Id('residentialUnits'),
  /** The Agrupación's own name ("3", "B"); null in a unit without Agrupaciones. */
  grouping: Schema.NullOr(Grouping),
  number: ApartmentNumber,
  /** Set instead of deleting an Apartamento that Membresías already reference. */
  deactivatedAt: Schema.optional(Schema.Finite),
});

export const ApartmentsDocSchema = SystemFields.extendWithSystemFields(
  'apartments',
  ApartmentsTableSchema
);

/** What identifies an Apartamento to a reader, without its unit. */
export const ApartmentLabel = Schema.Struct({
  grouping: ApartmentsTableSchema.fields.grouping,
  number: ApartmentsTableSchema.fields.number,
});

export type ApartmentLabel = typeof ApartmentLabel.Type;

export const CreateApartmentDto = ApartmentLabel;

export type CreateApartmentDto = typeof CreateApartmentDto.Type;

export const RenameApartmentDto = Schema.Struct({
  apartmentId: Id('apartments'),
  ...ApartmentLabel.fields,
});

export type RenameApartmentDto = typeof RenameApartmentDto.Type;

/** Whether removing an Apartamento deleted it or, because it had been used, deactivated it. */
export const ApartmentRemoval = Schema.Literals(['deleted', 'deactivated']);

export type ApartmentRemoval = typeof ApartmentRemoval.Type;
