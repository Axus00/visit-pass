import type * as Ref from '@confect/core/Ref';

import type refs from '@repo/backend/refs';

export type PorterShiftState = Ref.Returns<
  typeof refs.public.shifts.getMyState
>;

export type ShiftStats = NonNullable<PorterShiftState['openShiftStats']>;

export type PassResolution = Ref.Returns<typeof refs.public.visits.resolvePass>;

export type ResolvedPass = Extract<
  PassResolution,
  { outcome: 'admissible' }
>['pass'];

export type ApartmentSummary = Ref.Returns<
  typeof refs.public.residentialUnits.listApartments
>[number];

type RejectedPassResolution = Extract<PassResolution, { outcome: 'rejected' }>;

/**
 * A rejected Pase the Portero admits anyway, handed from Escanear to the
 * Registro manual through history state so the Visitante's details and the
 * Pase token never enter the URL or the browser history list.
 */
export type ManualEntryPrefill = Pick<
  ResolvedPass,
  'visitorName' | 'visitorDocument' | 'apartmentId' | 'type'
> & {
  token: string;
  reason: RejectedPassResolution['reason'];
};

declare module '@tanstack/react-router' {
  interface HistoryState {
    /** Set by Escanear's "Registrar como ingreso manual"; absent otherwise. */
    manualEntryPrefill?: ManualEntryPrefill;
  }
}
