import * as Predicate from 'effect/Predicate';

import { PASS_REJECTION_LABELS } from './labels.constant';

type BackendErrorFields = {
  _tag?: unknown;
  reason?: unknown;
  limit?: unknown;
};

/** Copy per `_tag`; a function reads the error's own fields into the message. */
const MESSAGES_BY_TAG: Record<
  string,
  string | ((error: BackendErrorFields) => string)
> = {
  'Authentication/NoUserIdentityFoundError':
    'Tu sesión expiró. Vuelve a iniciar sesión.',
  'Memberships/AccessDeniedError':
    'No tienes permiso para hacer esto con esta Membresía.',
  'Memberships/MembershipAlreadyExistsError':
    'Ya existe una Membresía con ese correo y Rol.',
  'Memberships/MembershipNotFoundError': 'La Membresía no existe.',
  'Memberships/CannotRevokeOwnMembershipError':
    'No puedes revocar tu propia Membresía.',
  'ResidentialUnits/ApartmentNotFoundError': 'El Apartamento no existe.',
  'ResidentialUnits/ApartmentLimitReachedError': ({ limit }) =>
    Predicate.isNumber(limit)
      ? `La unidad alcanzó el máximo de ${limit} Apartamentos.`
      : 'La unidad alcanzó el máximo de Apartamentos permitidos.',
  'ResidentialUnits/ResidentialUnitNotFoundError':
    'La Unidad residencial no existe.',
  'ResidentialUnits/NotSuperadminError': 'Solo un Superadmin puede hacer esto.',
  'Authorizations/AuthorizationNotFoundError': 'La Autorización no existe.',
  'Authorizations/PassNotFoundError': 'El Pase no existe.',
  'Authorizations/PassNotActiveError': 'El Pase ya no está vigente.',
  'Authorizations/FavoriteNotFoundError': 'El Favorito no existe.',
  'Authorizations/FavoriteLimitReachedError': ({ limit }) =>
    Predicate.isNumber(limit)
      ? `Llegaste al máximo de ${limit} Favoritos; elimina alguno para guardar otro.`
      : 'Llegaste al máximo de Favoritos; elimina alguno para guardar otro.',
  'Visits/VisitNotFoundError': 'La Visita no existe.',
  'Visits/VisitAlreadyExitedError': 'La Salida ya estaba registrada.',
  'Visits/VisitAlreadyVoidedError': 'La Visita ya estaba anulada.',
  'Visits/VisitorDocumentRequiredError':
    'Completa el documento de identidad del Visitante antes de registrar el Ingreso.',
  'Shifts/NoOpenShiftError': 'Inicia tu Turno antes de registrar Ingresos.',
  'Shifts/ShiftAlreadyOpenError': 'Ya tienes un Turno abierto.',
  'Shifts/ShiftNotFoundError': 'El Turno no existe.',
  'Shifts/InvalidShiftTransitionError':
    'El Turno no admite esa acción en su estado actual.',
  'ShiftReports/ShiftReportNotAllowedError':
    'Solo puedes generar Reportes de tus propios Turnos.',
};

const MESSAGES_BY_REASON: Record<string, string> = {
  residentNeedsApartment:
    'Un Residente necesita Apartamento y Tipo de ocupación.',
  onlyResidentsHaveApartment:
    'Solo los Residentes se vinculan a un Apartamento.',
  invalidEmail: 'El correo no es válido.',
  startsInThePast: 'La fecha no puede ser anterior a hoy.',
  endBeforeStart: 'La fecha final debe ser posterior a la inicial.',
  rangeTooLong: 'El rango de fechas es demasiado largo.',
  missingEndDate: 'Indica la fecha final.',
  missingWeekdays: 'Elige al menos un día de la semana.',
  noAllowedDayInRange:
    'Ningún día entre las fechas elegidas cae en los días de la semana permitidos.',
  singleVisitorRequired: 'Este tipo de Autorización admite un solo Visitante.',
  tooLong: 'Un Turno no puede durar más de 24 horas.',
  endsInThePast: 'El Turno ya habría terminado. Elige un horario futuro.',
  tooManyScheduled:
    'La unidad ya tiene el máximo de Turnos programados; cancela alguno antes de programar otro.',
  notAPorter: 'La Membresía elegida no es de un Portero activo.',
  shiftNotStarted:
    'El Turno aún no ha comenzado; genera el Reporte cuando esté en curso o cerrado.',
  noRecipients:
    'La unidad no tiene Administradores activos con correo; genera el Excel para descargarlo.',
  ...PASS_REJECTION_LABELS,
};

const FALLBACK_MESSAGE = 'Algo salió mal. Inténtalo de nuevo.';

/** Spanish copy for a typed backend error, keyed by its `_tag` and `reason`. */
export function describeBackendError(error: unknown): string {
  const tagged = error as BackendErrorFields | null;
  const reason = typeof tagged?.reason === 'string' ? tagged.reason : null;
  const tag = typeof tagged?._tag === 'string' ? tagged._tag : null;

  const reasonMessage = Predicate.isNull(reason)
    ? undefined
    : MESSAGES_BY_REASON[reason];
  const tagEntry = Predicate.isNull(tag) ? undefined : MESSAGES_BY_TAG[tag];
  const tagMessage = Predicate.isFunction(tagEntry)
    ? tagEntry(tagged ?? {})
    : tagEntry;

  return reasonMessage ?? tagMessage ?? FALLBACK_MESSAGE;
}
