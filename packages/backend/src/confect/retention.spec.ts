import { FunctionSpec, GroupSpec } from '@confect/core';
import * as Schema from 'effect/Schema';

import { Id } from './_generated/id';
import * as CalendarDomain from './modules/calendar/domain';

const Cursor = Schema.NullOr(Schema.String);

export default GroupSpec.make()
  // -*******************************************************************************-
  // Internal
  // -*******************************************************************************-
  .addFunction(
    /** Daily cron entry point: fans the sweeps out per Unidad residencial. */
    FunctionSpec.internalMutation({
      name: 'run',
      args: () => ({}),
      returns: () => Schema.Null,
      error: () => Schema.Never,
    })
  )
  .addFunction(
    FunctionSpec.internalMutation({
      name: 'sweepUnits',
      args: () => ({ now: Schema.Finite, cursor: Cursor }),
      returns: () => Schema.Null,
      error: () => Schema.Never,
    })
  )
  .addFunction(
    FunctionSpec.internalMutation({
      name: 'anonymizeVisits',
      args: () => ({
        residentialUnitId: Id('residentialUnits'),
        cutoff: Schema.Finite,
        cursor: Cursor,
      }),
      returns: () => Schema.Null,
      error: () => Schema.Never,
    })
  )
  .addFunction(
    FunctionSpec.internalMutation({
      name: 'purgeUnusedPasses',
      args: () => ({
        residentialUnitId: Id('residentialUnits'),
        cutoffDate: CalendarDomain.LocalDate,
        cursor: Cursor,
      }),
      returns: () => Schema.Null,
      error: () => Schema.Never,
    })
  )
  .addFunction(
    FunctionSpec.internalMutation({
      name: 'purgeShiftReports',
      args: () => ({ cutoff: Schema.Finite }),
      returns: () => Schema.Null,
      error: () => Schema.Never,
    })
  );
