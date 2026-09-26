import * as Result from 'effect/Result';
import { describe, expect, it } from 'vitest';

import { ALL_WEEKDAYS } from './admission';
import { MAX_SERVICE_DAYS } from './models';
import { resolveAuthorizationValidity } from './validity';

const today = '2026-09-26';
const oneVisitor = [{ name: 'Ana' }];

describe('resolveAuthorizationValidity', () => {
  it('limits a Temporal to its start day on every weekday', () => {
    expect(
      resolveAuthorizationValidity(
        {
          type: 'temporary',
          startDate: today,
          endDate: '2026-10-30',
          weekdays: [1],
          visitors: oneVisitor,
        },
        today
      )
    ).toEqual(
      Result.succeed({
        startDate: today,
        endDate: today,
        weekdays: ALL_WEEKDAYS,
      })
    );
  });

  it('accepts an Evento with several Visitantes', () => {
    const validity = resolveAuthorizationValidity(
      {
        type: 'event',
        startDate: '2026-09-30',
        visitors: [{ name: 'Ana' }, { name: 'Luis' }],
      },
      today
    );

    expect(validity).toEqual(
      Result.succeed({
        startDate: '2026-09-30',
        endDate: '2026-09-30',
        weekdays: ALL_WEEKDAYS,
      })
    );
  });

  it('rejects a start day before today', () => {
    expect(
      resolveAuthorizationValidity(
        { type: 'event', startDate: '2026-09-25', visitors: oneVisitor },
        today
      )
    ).toEqual(Result.fail('startsInThePast'));
  });

  it('requires exactly one Visitante for Temporal and Servicio', () => {
    const twoVisitors = [{ name: 'Ana' }, { name: 'Luis' }];

    expect(
      resolveAuthorizationValidity(
        { type: 'temporary', startDate: today, visitors: twoVisitors },
        today
      )
    ).toEqual(Result.fail('singleVisitorRequired'));
    expect(
      resolveAuthorizationValidity(
        {
          type: 'service',
          startDate: today,
          endDate: today,
          weekdays: [1],
          visitors: twoVisitors,
        },
        today
      )
    ).toEqual(Result.fail('singleVisitorRequired'));
  });

  it('dedupes and sorts Servicio weekdays', () => {
    expect(
      resolveAuthorizationValidity(
        {
          type: 'service',
          startDate: today,
          endDate: '2026-12-31',
          weekdays: [5, 1, 3, 1],
          visitors: oneVisitor,
        },
        today
      )
    ).toEqual(
      Result.succeed({
        startDate: today,
        endDate: '2026-12-31',
        weekdays: [1, 3, 5],
      })
    );
  });

  it('rejects an incomplete or inverted Servicio range', () => {
    const service = {
      type: 'service',
      startDate: today,
      weekdays: [1],
      visitors: oneVisitor,
    } as const;

    expect(resolveAuthorizationValidity(service, today)).toEqual(
      Result.fail('missingEndDate')
    );
    expect(
      resolveAuthorizationValidity(
        { ...service, endDate: '2026-09-25' },
        '2026-09-20'
      )
    ).toEqual(Result.fail('endBeforeStart'));
    expect(
      resolveAuthorizationValidity(
        { ...service, endDate: '2026-12-31', weekdays: [] },
        today
      )
    ).toEqual(Result.fail('missingWeekdays'));
  });

  it(`caps a Servicio at ${MAX_SERVICE_DAYS} days`, () => {
    const service = {
      type: 'service',
      startDate: '2027-01-01',
      weekdays: [1],
      visitors: oneVisitor,
    } as const;

    expect(
      Result.isSuccess(
        resolveAuthorizationValidity(
          { ...service, endDate: '2028-01-01' },
          today
        )
      )
    ).toBe(true);
    expect(
      resolveAuthorizationValidity({ ...service, endDate: '2028-01-02' }, today)
    ).toEqual(Result.fail('rangeTooLong'));
  });
});
