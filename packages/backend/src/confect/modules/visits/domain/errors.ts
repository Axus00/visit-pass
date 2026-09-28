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

/** The Pase carries no document and the Portero did not complete it at the Ingreso. */
export class VisitorDocumentRequiredError extends Schema.TaggedError<VisitorDocumentRequiredError>()(
  'Visits/VisitorDocumentRequiredError',
  {}
) {}
