import type * as Ref from '@confect/core/Ref';
import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';

import type refs from '@repo/backend/refs';
import * as MembershipsShared from '@repo/backend/shared/memberships';
import * as ResidentialUnitsShared from '@repo/backend/shared/residentialUnits';
import * as VisitsShared from '@repo/backend/shared/visits';

import * as Forms from '#modules/forms';
import type * as VisitPass from '#modules/visit-pass';

import { parseApartmentNumbers } from './apartment-numbers.utils';

export type MembershipDetail = Ref.Returns<
  typeof refs.public.memberships.listForUnit
>[number];

export type MembershipStatus = MembershipDetail['status'];

export type ApartmentSummary = Ref.Returns<
  typeof refs.public.residentialUnits.listApartments
>[number];

export type UnitOverview = Ref.Returns<
  typeof refs.public.residentialUnits.getOverview
>;

export type ShiftStatus = VisitPass.ShiftSummary['status'];

export const MEMBERSHIP_STATUS_LABELS = {
  active: 'Activa',
  pending: 'Pendiente',
  revoked: 'Revocada',
} as const satisfies Record<MembershipStatus, string>;

export const SHIFT_STATUS_LABELS = {
  open: 'En curso',
  scheduled: 'Programado',
  closed: 'Cerrado',
} as const satisfies Record<ShiftStatus, string>;

export const SHIFT_REPORT_EMAIL_LABELS = {
  notRequested: 'Sin envío por correo',
  pending: 'Enviando por correo…',
  sent: 'Enviado por correo',
  failed: 'No se pudo enviar el correo',
  notConfigured: 'Correo no configurado en este entorno',
} as const satisfies Record<
  VisitPass.ShiftReportSummary['emailStatus'],
  string
>;

const requiredText = (message: string) =>
  Schema.String.check(
    Schema.makeFilter((text: string) => text.trim().length > 0 || message)
  );

// -*******************************************************************************-
// Form schemas: the form's own values, with the Spanish copy each field shows
// -*******************************************************************************-

export const InviteMemberFormStandardSchema = Forms.toSpanishStandardSchema(
  Schema.Struct({
    email: Schema.String.check(
      Schema.makeFilter(
        (email: string) =>
          MembershipsShared.isPlausibleEmailAddress(email.trim()) ||
          'Escribe un correo válido, como nombre@correo.com.'
      )
    ),
    displayName: Schema.String.check(
      Schema.isMaxLength(120, { message: 'Usa máximo 120 caracteres.' })
    ),
    role: MembershipsShared.Role,
    apartmentId: Schema.String,
    occupancyType: MembershipsShared.OccupancyType,
  }).check(
    Schema.makeFilter(
      (value: { readonly role: string; readonly apartmentId: string }) =>
        value.role !== 'resident' ||
        value.apartmentId.length > 0 || {
          path: ['apartmentId'],
          issue: 'Elige el Apartamento del Residente.',
        }
    )
  )
);

export const ScheduleShiftFormStandardSchema = Forms.toSpanishStandardSchema(
  Schema.Struct({
    porterMembershipId: requiredText('Elige el Portero.'),
    date: requiredText('Elige la fecha.'),
    startTime: requiredText('Indica la hora de inicio.'),
    endTime: requiredText('Indica la hora de fin.'),
  })
);

export const CreateApartmentsFormStandardSchema = Forms.toSpanishStandardSchema(
  Schema.Struct({
    tower: requiredText('Indica la Torre.').check(
      Schema.isMaxLength(ResidentialUnitsShared.APARTMENT_PART_MAX_LENGTH, {
        message: `Usa máximo ${ResidentialUnitsShared.APARTMENT_PART_MAX_LENGTH} caracteres.`,
      })
    ),
    numbers: Schema.String.check(
      Schema.makeFilter((text: string) => {
        const parsed = parseApartmentNumbers(text);

        return Result.isSuccess(parsed) || parsed.failure;
      })
    ),
  })
);

export const UpdateUnitFormStandardSchema = Forms.toSpanishStandardSchema(
  Schema.Struct({
    name: requiredText('Escribe el nombre de la Unidad residencial.').check(
      Schema.isMaxLength(ResidentialUnitsShared.NAME_MAX_LENGTH, {
        message: `Usa máximo ${ResidentialUnitsShared.NAME_MAX_LENGTH} caracteres.`,
      })
    ),
    city: requiredText('Escribe la ciudad.').check(
      Schema.isMaxLength(ResidentialUnitsShared.NAME_MAX_LENGTH, {
        message: `Usa máximo ${ResidentialUnitsShared.NAME_MAX_LENGTH} caracteres.`,
      })
    ),
    visitRetentionMonths: Schema.Finite.check(
      Schema.makeFilter(
        (months: number) =>
          (Number.isInteger(months) &&
            months >= ResidentialUnitsShared.MIN_VISIT_RETENTION_MONTHS &&
            months <= ResidentialUnitsShared.MAX_VISIT_RETENTION_MONTHS) ||
          `Elige entre ${ResidentialUnitsShared.MIN_VISIT_RETENTION_MONTHS} y ${ResidentialUnitsShared.MAX_VISIT_RETENTION_MONTHS} meses.`
      )
    ),
  })
);

export const VoidVisitFormStandardSchema = Forms.toSpanishStandardSchema(
  Schema.Struct({
    reason: Schema.String.check(
      Schema.makeFilter(
        (reason: string) =>
          reason.trim().length >= 3 ||
          'Explica el motivo en al menos 3 caracteres.'
      ),
      Schema.isMaxLength(VisitsShared.VOID_REASON_MAX_LENGTH, {
        message: `Usa máximo ${VisitsShared.VOID_REASON_MAX_LENGTH} caracteres.`,
      })
    ),
  })
);
