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
