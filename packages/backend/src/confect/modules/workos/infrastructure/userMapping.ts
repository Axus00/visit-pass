import type { User } from '@workos-inc/node';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { env } from '#convex/_generated/server';

import * as CommonEmailAddressesDomain from '../../commonEmailAddresses/domain';
import type * as UsersDomain from '../../users/domain';

// -*******************************************************************************-
// Private
// -*******************************************************************************-

function computeIdentityTokenIdentifier(
  workosClientId: string,
  externalUserId: string
) {
  return `https://api.workos.com/user_management/${workosClientId}|${externalUserId}`;
}

// -*******************************************************************************-
// API
// -*******************************************************************************-

export const toUserDoc = Effect.fn('WorkOS.toUserDoc')(function* (
  workosUser: User
) {
  const dateStringDecoder = Schema.decodeEffect(Schema.DateFromString);

  const lastSignInAt = workosUser.lastSignInAt
    ? yield* dateStringDecoder(workosUser.lastSignInAt)
    : null;

  const externalUpdatedAt = yield* dateStringDecoder(workosUser.updatedAt);
  const externalCreatedAt = yield* dateStringDecoder(workosUser.createdAt);

  return {
    externalId: workosUser.id,
    identityTokenIdentifier: computeIdentityTokenIdentifier(
      env.WORKOS_CLIENT_ID,
      workosUser.id
    ),
    email: CommonEmailAddressesDomain.normalizeEmailAddress(workosUser.email),
    emailVerified: workosUser.emailVerified,
    firstName: workosUser.firstName,
    lastName: workosUser.lastName,
    profilePictureUrl: workosUser.profilePictureUrl,
    lastSignInAt: lastSignInAt?.valueOf() ?? null,
    locale: workosUser.locale,
    externalCreatedAt: externalCreatedAt.valueOf(),
    externalUpdatedAt: externalUpdatedAt.valueOf(),
  } satisfies Omit<UsersDomain.ActiveUsersDoc, '_id' | '_creationTime'>;
});
