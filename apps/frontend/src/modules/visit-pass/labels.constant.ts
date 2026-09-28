import type {
  OccupancyType,
  PassRejectionReason,
  PassStatus,
  Relationship,
  Role,
  VisitOrigin,
  VisitType,
} from './domain.models';

export const ROLE_LABELS = {
  resident: 'Residente',
  porter: 'Portero',
  administrator: 'Administrador',
} as const satisfies Record<Role, string>;

export const OCCUPANCY_LABELS = {
  owner: 'Propietario',
  tenant: 'Arrendatario',
} as const satisfies Record<OccupancyType, string>;

export const VISIT_TYPE_LABELS = {
  temporary: 'Temporal',
  event: 'Evento',
  service: 'Servicio',
} as const satisfies Record<VisitType, string>;

export const VISIT_ORIGIN_LABELS = {
  pass: 'Pase QR',
  manual: 'Registro manual',
} as const satisfies Record<VisitOrigin, string>;

export const RELATIONSHIP_LABELS = {
  family: 'Familiar',
  friend: 'Amigo',
  other: 'Otro',
} as const satisfies Record<Relationship, string>;

export const PASS_STATUS_LABELS = {
  active: 'Vigente',
  used: 'Usado',
  cancelled: 'Cancelado',
  replaced: 'Reemplazado',
} as const satisfies Record<PassStatus, string>;

/** What the Portero reads when a Pase is rejected. */
export const PASS_REJECTION_LABELS = {
  notFound: 'Pase no encontrado en esta unidad',
  cancelled: 'La Autorización fue cancelada',
  replaced: 'El Pase fue reemplazado por uno nuevo',
  alreadyUsed: 'El Pase ya fue usado',
  notYetValid: 'El Pase aún no es válido',
  expired: 'El Pase está vencido',
  weekdayNotAllowed: 'El Pase no es válido este día de la semana',
  apartmentWithoutResident: 'El Apartamento no tiene Residentes activos',
  alreadyInside: 'El Visitante ya está dentro de la unidad',
} as const satisfies Record<PassRejectionReason, string>;

/** Sunday first, matching the backend's `Weekday` (0–6). */
export const WEEKDAY_SHORT_LABELS = [
  'Dom',
  'Lun',
  'Mar',
  'Mié',
  'Jue',
  'Vie',
  'Sáb',
] as const;

export const WEEKDAY_LABELS = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
] as const;
