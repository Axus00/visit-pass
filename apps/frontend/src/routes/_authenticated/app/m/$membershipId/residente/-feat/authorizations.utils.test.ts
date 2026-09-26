import { describe, expect, it } from 'vitest';

import {
  classifyAuthorization,
  formatEntryCount,
  groupAuthorizationsByTab,
  partitionReplacedPasses,
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

describe('classifyAuthorization', () => {
  it('keeps an Autorización vigente through its last day', () => {
    expect(classifyAuthorization(authorization({}), today)).toBe('current');
    expect(
      classifyAuthorization(authorization({ endDate: '2026-10-01' }), today)
    ).toBe('current');
  });

  it('moves it to Pasadas once its last day is over', () => {
    expect(
      classifyAuthorization(authorization({ endDate: '2026-09-25' }), today)
    ).toBe('past');
  });

  it('files cancelled ones under Canceladas whatever their dates', () => {
    expect(
      classifyAuthorization(
        authorization({ status: 'cancelled', endDate: '2026-09-01' }),
        today
      )
    ).toBe('cancelled');
  });
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
});

describe('partitionReplacedPasses', () => {
  it('separates Pases replaced by a regenerated one', () => {
    const { live, replaced } = partitionReplacedPasses([
      { status: 'replaced' as const },
      { status: 'active' as const },
      { status: 'used' as const },
    ]);

    expect(live.map((pass) => pass.status)).toEqual(['active', 'used']);
    expect(replaced).toHaveLength(1);
  });
});

describe('formatEntryCount', () => {
  it('counts Ingresos in Spanish', () => {
    expect(formatEntryCount(0)).toBe('Sin ingresos');
    expect(formatEntryCount(1)).toBe('1 ingreso');
    expect(formatEntryCount(3)).toBe('3 ingresos');
  });
});
