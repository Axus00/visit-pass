import * as SystemFields from '@confect/core/SystemFields';
import * as Schema from 'effect/Schema';

import { Id } from '../../../_generated/id';

export const NAME_MAX_LENGTH = 120;
export const APARTMENT_PART_MAX_LENGTH = 20;
export const DEFAULT_VISIT_RETENTION_MONTHS = 12;
export const MIN_VISIT_RETENTION_MONTHS = 3;
export const MAX_VISIT_RETENTION_MONTHS = 24;

const Name = Schema.Trim.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(NAME_MAX_LENGTH)
);

const ApartmentPart = Schema.Trim.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(APARTMENT_PART_MAX_LENGTH)
);

export const VisitRetentionMonths = Schema.Int.check(
  Schema.isGreaterThanOrEqualTo(MIN_VISIT_RETENTION_MONTHS),
  Schema.isLessThanOrEqualTo(MAX_VISIT_RETENTION_MONTHS)
);

export const ResidentialUnitsTableSchema = Schema.Struct({
  name: Schema.String,
  city: Schema.String,
  /** IANA zone that decides which calendar day a Pase is valid on. */
  timeZone: Schema.String,
  /** Months a Visita keeps the Visitante's personal data before anonymization. */
  visitRetentionMonths: Schema.Finite,
});

export const ResidentialUnitsDocSchema = SystemFields.extendWithSystemFields(
  'residentialUnits',
  ResidentialUnitsTableSchema
);

export const ApartmentsTableSchema = Schema.Struct({
  residentialUnitId: Id('residentialUnits'),
  tower: Schema.String,
  number: Schema.String,
});

export const ApartmentsDocSchema = SystemFields.extendWithSystemFields(
  'apartments',
  ApartmentsTableSchema
);

/** Platform role outside every Membresía; creates Unidades residenciales. */
export const SuperadminsTableSchema = Schema.Struct({
  email: Schema.String,
});

// -*******************************************************************************-
// Payloads and projections
// -*******************************************************************************-

export const ResidentialUnitSummary = Schema.Struct({
  _id: Id('residentialUnits'),
  name: Schema.String,
  city: Schema.String,
  timeZone: Schema.String,
  visitRetentionMonths: Schema.Finite,
});

export type ResidentialUnitSummary = typeof ResidentialUnitSummary.Type;

export const ApartmentSummary = Schema.Struct({
  _id: Id('apartments'),
  tower: Schema.String,
  number: Schema.String,
  /** Display name such as `Torre 2 · 402`. */
  label: Schema.String,
  activeResidentCount: Schema.Finite,
});

export type ApartmentSummary = typeof ApartmentSummary.Type;

export const UnitOverview = Schema.Struct({
  unit: ResidentialUnitSummary,
  apartmentCount: Schema.Finite,
  activeResidentCount: Schema.Finite,
  porterCount: Schema.Finite,
  pendingMembershipCount: Schema.Finite,
  openShiftCount: Schema.Finite,
  visitsToday: Schema.Finite,
  visitorsInside: Schema.Finite,
});

export type UnitOverview = typeof UnitOverview.Type;

/** What the Superadmin sees for every Unidad residencial on the platform. */
export const PlatformUnitSummary = Schema.Struct({
  ...ResidentialUnitSummary.fields,
  administratorEmails: Schema.Array(Schema.String),
  apartmentCount: Schema.Finite,
});

export type PlatformUnitSummary = typeof PlatformUnitSummary.Type;

export const CreateResidentialUnitDto = Schema.Struct({
  name: Name,
  city: Name,
  administratorEmail: Schema.Trim.check(Schema.isMinLength(3)),
  administratorName: Schema.optional(Name),
});

export type CreateResidentialUnitDto = typeof CreateResidentialUnitDto.Type;

export const UpdateResidentialUnitDto = Schema.Struct({
  name: Name,
  city: Name,
  visitRetentionMonths: VisitRetentionMonths,
});

export type UpdateResidentialUnitDto = typeof UpdateResidentialUnitDto.Type;

/** Adds one Apartamento per number in the tower, skipping existing ones. */
export const CreateApartmentsDto = Schema.Struct({
  tower: ApartmentPart,
  numbers: Schema.Array(ApartmentPart).check(
    Schema.isMinLength(1),
    Schema.isMaxLength(500)
  ),
});

export type CreateApartmentsDto = typeof CreateApartmentsDto.Type;

export function formatApartmentLabel(apartment: {
  readonly tower: string;
  readonly number: string;
}) {
  return `Torre ${apartment.tower} · ${apartment.number}`;
}
