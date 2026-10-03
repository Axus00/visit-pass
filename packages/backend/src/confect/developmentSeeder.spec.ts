import { FunctionSpec, GroupSpec } from '@confect/core';
import * as Schema from 'effect/Schema';

import { Id } from './_generated/id';

export default GroupSpec.make()
  // -*******************************************************************************-
  // Internal
  // -*******************************************************************************-
  .addFunction(
    /** Idempotent: `pnpm setup:worktree` runs it on every setup. */
    FunctionSpec.internalAction({
      name: 'seed',
      args: () => ({}),
      returns: () => Schema.Null,
      error: () => Schema.Never,
    })
  )
  .addFunction(
    FunctionSpec.internalMutation({
      name: 'seedResidentialUnit',
      args: () => ({ externalOrganizationId: Schema.String }),
      returns: () =>
        Schema.Struct({
          userId: Id('users'),
          residentialUnitId: Id('residentialUnits'),
        }),
      error: () => Schema.Never,
    })
  );
