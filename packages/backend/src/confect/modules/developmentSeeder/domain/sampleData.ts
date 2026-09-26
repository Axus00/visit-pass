import type * as CalendarDomain from '../../calendar/domain';

/** The Superadmin of every development deployment. */
export const SUPERADMIN_EMAIL = 'agent@example.org';

export interface SampleUnit {
  readonly name: string;
  readonly city: string;
  readonly towers: ReadonlyArray<string>;
  readonly floors: number;
  readonly apartmentsPerFloor: number;
}

/**
 * The main sample: every development account has a Membresía here, and it
 * holds Favoritos, Autorizaciones, Turnos and Visitas for every panel.
 */
export const ALMENDROS: SampleUnit = {
  name: 'Conjunto Residencial Los Almendros',
  city: 'Bogotá',
  towers: ['1', '2'],
  floors: 5,
  apartmentsPerFloor: 4,
};

/** A second unit whose data must never leak into Los Almendros. */
export const MIRADOR: SampleUnit = {
  name: 'Edificio Mirador 80',
  city: 'Medellín',
  towers: ['A'],
  floors: 3,
  apartmentsPerFloor: 4,
};

/** Apartamento numbers floor by floor: `101`, `102`, …, `201`, … */
export function apartmentNumbersOf(unit: SampleUnit) {
  return Array.from({ length: unit.floors }, (_, floorIndex) =>
    Array.from(
      { length: unit.apartmentsPerFloor },
      (__, apartmentIndex) =>
        `${floorIndex + 1}${String(apartmentIndex + 1).padStart(2, '0')}`
    )
  ).flat();
}

/**
 * The instant a wall-clock `time` (`HH:MM`) on `localDate` happens in
 * `timeZone`. Exact for zones without daylight saving, such as Colombia's.
 */
export function localDateTimeToEpochMillis(
  localDate: CalendarDomain.LocalDate,
  time: string,
  timeZone: string
) {
  const wallClockAsUtc = Date.parse(`${localDate}T${time}:00Z`);

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(wallClockAsUtc);

  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((candidate) => candidate.type === type)?.value ?? 0);

  const zoneWallClockAsUtc = Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour'),
    part('minute'),
    part('second')
  );
  const zoneOffsetMillis = zoneWallClockAsUtc - wallClockAsUtc;

  return wallClockAsUtc - zoneOffsetMillis;
}
