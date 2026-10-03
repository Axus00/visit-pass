import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';

import type { UsersDoc } from '../../../_generated/docs';
import type { ActiveUsersDoc } from './models';

// -*******************************************************************************-
// API
// -*******************************************************************************-

/**
 * Filters a raw User lookup to active records while preserving a missing User
 * as null. Compose this at call sites where deleted Users are unavailable.
 */
export const isActiveOrNull = Effect.map(
  (user: UsersDoc | null): ActiveUsersDoc | null => {
    const isMissingOrDeletedUser =
      Predicate.isNull(user) || 'deletedAt' in user;

    if (isMissingOrDeletedUser) return null;

    return user;
  }
);
