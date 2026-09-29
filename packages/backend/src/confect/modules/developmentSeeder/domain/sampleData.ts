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
