import * as Schema from 'effect/Schema';

import * as AuthorizationsDomain from '../../authorizations/domain';

export class PassRejectedError extends Schema.TaggedError<PassRejectedError>()(
  'Visits/PassRejectedError',
  { reason: AuthorizationsDomain.PassRejectionReason }
) {}

export class VisitNotFoundError extends Schema.TaggedError<VisitNotFoundError>()(
  'Visits/VisitNotFoundError',
  {}
) {}

export class VisitAlreadyVoidedError extends Schema.TaggedError<VisitAlreadyVoidedError>()(
  'Visits/VisitAlreadyVoidedError',
  {}
) {}

export class VisitAlreadyExitedError extends Schema.TaggedError<VisitAlreadyExitedError>()(
  'Visits/VisitAlreadyExitedError',
  {}
) {}
