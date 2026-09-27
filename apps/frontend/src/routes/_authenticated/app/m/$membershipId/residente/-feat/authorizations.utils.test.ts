import { describe, expect, it } from 'vitest';

import {
  describePassBadge,
  formatEntryCount,
  groupAuthorizationsByTab,
} from './authorizations.utils';

const today = '2026-09-26';

const authorization = (
  overrides: Partial<{
    id: string;
    status: 'active' | 'cancelled';
    startDate: string;
    endDate: string;
    _creationTime: number;
  }>
) => ({
  id: 'a',
  status: 'active' as const,
  startDate: today,
  endDate: today,
  _creationTime: 0,
  ...overrides,
});

describe('groupAuthorizationsByTab', () => {
  it('orders Vigentes soonest first and the rest latest first', () => {
    const grouped = groupAuthorizationsByTab(
      [
        authorization({
          id: 'later',
          startDate: '2026-10-05',
          endDate: '2026-10-05',
        }),
        authorization({ id: 'today' }),
        authorization({
          id: 'old',
          startDate: '2026-09-01',
          endDate: '2026-09-01',
        }),
        authorization({
          id: 'older',
          startDate: '2026-08-01',
          endDate: '2026-08-01',
        }),
        authorization({
          id: 'cancelled-first',
          status: 'cancelled',
          _creationTime: 1,
        }),
        authorization({
          id: 'cancelled-last',
          status: 'cancelled',
          _creationTime: 2,
        }),
      ],
      today
    );

    expect(grouped.current.map((item) => item.id)).toEqual(['today', 'later']);
    expect(grouped.past.map((item) => item.id)).toEqual(['old', 'older']);
    expect(grouped.cancelled.map((item) => item.id)).toEqual([
      'cancelled-last',
      'cancelled-first',
    ]);
  });

  it('keeps an Autorización vigente through its last day, then moves it to Pasadas', () => {
    const grouped = groupAuthorizationsByTab(
      [
        authorization({ id: 'ends-today' }),
        authorization({ id: 'ended-yesterday', endDate: '2026-09-25' }),
      ],
      today
    );

    expect(grouped.current.map((item) => item.id)).toEqual(['ends-today']);
    expect(grouped.past.map((item) => item.id)).toEqual(['ended-yesterday']);
  });

  it('files cancelled ones under Canceladas whatever their dates', () => {
    const grouped = groupAuthorizationsByTab(
      [
        authorization({
          id: 'past',
          status: 'cancelled',
          endDate: '2026-09-01',
        }),
        authorization({
          id: 'future',
          status: 'cancelled',
          endDate: '2026-10-01',
        }),
      ],
      today
    );

    expect(grouped.current).toEqual([]);
    expect(grouped.past).toEqual([]);
    expect(grouped.cancelled).toHaveLength(2);
  });
});

describe('formatEntryCount', () => {
  it('counts Ingresos in Spanish', () => {
    expect(formatEntryCount(0)).toBe('Sin ingresos');
    expect(formatEntryCount(1)).toBe('1 ingreso');
    expect(formatEntryCount(3)).toBe('3 ingresos');
  });
});

describe('describePassBadge', () => {
  it('shows an unused Pase of a current Autorización as Vigente', () => {
    expect(describePassBadge('active', false)).toEqual({
      label: 'Vigente',
      variant: 'success',
    });
  });

  it('shows an unused Pase of an ended Autorización as Vencido', () => {
    expect(describePassBadge('active', true)).toEqual({
      label: 'Vencido',
      variant: 'destructive',
    });
  });

  it('keeps the stored status of a used Pase once the Autorización ended', () => {
    expect(describePassBadge('used', true)).toEqual({
      label: 'Usado',
      variant: 'secondary',
    });
  });
});
