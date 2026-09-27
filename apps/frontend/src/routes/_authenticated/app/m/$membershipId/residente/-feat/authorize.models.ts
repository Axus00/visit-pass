import type * as Ref from '@confect/core/Ref';
import { revalidateLogic } from '@tanstack/react-form';
import * as Predicate from 'effect/Predicate';
import * as Result from 'effect/Result';

import type refs from '@repo/backend/refs';
import * as AuthorizationsShared from '@repo/backend/shared/authorizations';
import * as CalendarShared from '@repo/backend/shared/calendar';

import * as VisitPass from '#modules/visit-pass';

import type { PassValidity } from './pass-share.utils';

export type CreateAuthorizationDto = Omit<
  Ref.Args<typeof refs.public.authorizations.create>,
  'membershipId'
>;

export type FavoriteSummary = Ref.Returns<
  typeof refs.public.authorizations.listFavorites
>[number];

export type FavoriteId = FavoriteSummary['_id'];

export type PassSummary = VisitPass.AuthorizationSummary['passes'][number];

/** What the "Pase listo" sheet needs to show and share the new Pases. */
export type SharedAuthorization = PassValidity & {
  eventName?: string;
  passes: ReadonlyArray<Pick<PassSummary, 'token' | 'visitorName'>>;
};

/** Lunes a viernes, the usual Servicio schedule. */
export const DEFAULT_SERVICE_WEEKDAYS: ReadonlyArray<number> = [1, 2, 3, 4, 5];

/** Monday-first, as the weekday toggles read. */
export const WEEKDAY_TOGGLE_ORDER: ReadonlyArray<number> = [
  1, 2, 3, 4, 5, 6, 0,
];

const DEFAULT_SERVICE_LENGTH_DAYS = 30;

export type GuestRow = { name: string; document: string };

export type AuthorizeFormValues = {
  type: VisitPass.VisitType;
  visitorName: string;
  visitorDocument: string;
  eventName: string;
  startDate: string;
  endDate: string;
  weekdays: Array<number>;
  guests: Array<GuestRow>;
  saveAsFavorite: boolean;
  favoriteRelationship: VisitPass.Relationship;
  /**
   * The Favorito this form already created, so retrying after the Autorización
   * failed links it instead of saving a duplicate.
   */
  savedFavorite: SavedFavorite | null;
};

export type SavedFavorite = {
  id: FavoriteId;
  visitorName: string;
  visitorDocument: string;
};

export function defaultAuthorizeFormValues(
  today: string,
  type: VisitPass.VisitType = 'temporary'
): AuthorizeFormValues {
  return {
    type,
    visitorName: '',
    visitorDocument: '',
    eventName: '',
    startDate: today,
    endDate: CalendarShared.addDays(today, DEFAULT_SERVICE_LENGTH_DAYS),
    weekdays: [...DEFAULT_SERVICE_WEEKDAYS],
    guests: [{ name: '', document: '' }],
    saveAsFavorite: false,
    favoriteRelationship: 'family',
    savedFavorite: null,
  };
}

const optionalText = (value: string) => {
  const trimmed = value.trim();

  return trimmed.length === 0 ? undefined : trimmed;
};

/** The `authorizations.create` payload for the form, without `membershipId`. */
export function buildCreateAuthorizationDto(
  values: AuthorizeFormValues,
  favoriteId?: FavoriteId
): CreateAuthorizationDto {
  if (values.type === 'event')
    return {
      type: 'event',
      startDate: values.startDate,
      eventName: optionalText(values.eventName),
      visitors: values.guests.map((guest) => ({
        name: guest.name.trim(),
        document: optionalText(guest.document),
      })),
    };

  const visitor = {
    name: values.visitorName.trim(),
    document: optionalText(values.visitorDocument),
    favoriteId,
  };

  if (values.type === 'temporary')
    return {
      type: 'temporary',
      startDate: values.startDate,
      visitors: [visitor],
    };

  return {
    type: 'service',
    startDate: values.startDate,
    // A cleared "Fecha final" reads as missing, not as an empty date.
    endDate: optionalText(values.endDate),
    weekdays: values.weekdays,
    visitors: [visitor],
  };
}

export function validateVisitorName(value: string) {
  const length = value.trim().length;

  if (length === 0) return 'Escribe el nombre del Visitante.';
  if (length > AuthorizationsShared.VISITOR_NAME_MAX_LENGTH)
    return `Máximo ${AuthorizationsShared.VISITOR_NAME_MAX_LENGTH} caracteres.`;

  return undefined;
}

export function validateVisitorDocument(value: string) {
  const length = value.trim().length;

  if (length === 0) return undefined;
  if (length < 3) return 'El documento debe tener al menos 3 caracteres.';
  if (length > AuthorizationsShared.VISITOR_DOCUMENT_MAX_LENGTH)
    return `Máximo ${AuthorizationsShared.VISITOR_DOCUMENT_MAX_LENGTH} caracteres.`;

  return undefined;
}

type FieldErrors = Partial<Record<string, string>>;

const REASON_FIELD = {
  startsInThePast: 'startDate',
  endBeforeStart: 'endDate',
  rangeTooLong: 'endDate',
  missingEndDate: 'endDate',
  missingWeekdays: 'weekdays',
  noAllowedDayInRange: 'weekdays',
  singleVisitorRequired: 'visitorName',
} as const satisfies Record<
  AuthorizationsShared.InvalidAuthorizationReason,
  string
>;

/**
 * Form-level check: field rules for the fields the chosen type
 * shows, then the backend's own validity rules once there is a start date to
 * run them on. Returns TanStack Form's `{ fields }` shape, or `undefined` when
 * the form can be sent.
 */
export function validateAuthorizeForm(
  values: AuthorizeFormValues,
  today: string
): { fields: FieldErrors } | undefined {
  const eventNameTooLong =
    values.type === 'event' &&
    values.eventName.trim().length > AuthorizationsShared.EVENT_NAME_MAX_LENGTH;
  const isMissingStartDate = values.startDate.trim().length === 0;
  const missingStartDateMessage =
    values.type === 'service'
      ? 'Indica la fecha de inicio.'
      : 'Indica la fecha.';
  const startDateCheck = [
    'startDate',
    isMissingStartDate ? missingStartDateMessage : undefined,
  ] as const;
  const fieldChecks: ReadonlyArray<readonly [string, string | undefined]> =
    values.type === 'event'
      ? [
          startDateCheck,
          [
            'eventName',
            eventNameTooLong
              ? `Máximo ${AuthorizationsShared.EVENT_NAME_MAX_LENGTH} caracteres.`
              : undefined,
          ],
          ...values.guests.flatMap((guest, index) => [
            [`guests[${index}].name`, validateVisitorName(guest.name)] as const,
            [
              `guests[${index}].document`,
              validateVisitorDocument(guest.document),
            ] as const,
          ]),
        ]
      : [
          startDateCheck,
          ['visitorName', validateVisitorName(values.visitorName)],
          ['visitorDocument', validateVisitorDocument(values.visitorDocument)],
        ];
  const fields: FieldErrors = Object.fromEntries(
    fieldChecks.filter(([, error]) => Predicate.isNotUndefined(error))
  );

  if (isMissingStartDate) return { fields };

  const validity = AuthorizationsShared.resolveAuthorizationValidity(
    buildCreateAuthorizationDto(values),
    today
  );
  const allFields: FieldErrors = Result.isFailure(validity)
    ? {
        [REASON_FIELD[validity.failure]]: VisitPass.describeBackendError({
          reason: validity.failure,
        }),
        ...fields,
      }
    : fields;

  return Object.keys(allFields).length === 0
    ? undefined
    : { fields: allFields };
}

/**
 * The authorize form's `validationLogic` and `validators`: `validateAuthorizeForm`
 * runs on the first submit, then on every change, so fixing any field a
 * cross-field rule involves (type, dates, weekdays) clears the error that rule
 * left on another field. `today` is read on each run.
 */
export function authorizeFormValidation(today: () => string) {
  return {
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: ({ value }: { value: AuthorizeFormValues }) =>
        validateAuthorizeForm(value, today()),
    },
  };
}

/** The validity the backend stores for a valid payload, for the share sheet. */
export function resolveSharedValidity(
  payload: CreateAuthorizationDto,
  today: string
): PassValidity {
  const validity = AuthorizationsShared.resolveAuthorizationValidity(
    payload,
    today
  );

  if (Result.isSuccess(validity))
    return { type: payload.type, ...validity.success };

  return {
    type: payload.type,
    startDate: payload.startDate,
    endDate: payload.endDate ?? payload.startDate,
    weekdays: payload.weekdays ?? [],
  };
}

export type CreateFavoriteDto = Omit<
  Ref.Args<typeof refs.public.authorizations.createFavorite>,
  'membershipId'
>;
