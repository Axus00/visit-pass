import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Predicate from 'effect/Predicate';

import { DatabaseReader, DatabaseWriter } from '../../../_generated/services';
import * as AuthenticationDomain from '../../authentication/domain';
import * as CommonEmailAddressesDomain from '../../commonEmailAddresses/domain';
import * as UsersApplication from '../../users/application';
import * as UsersDomain from '../../users/domain';
import * as Domain from '../domain';

/** Whether `email` holds the platform Superadmin role. */
export const isSuperadminEmail = Effect.fn(
  'ResidentialUnits.isSuperadminEmail'
)(function* (email: string) {
  const reader = yield* DatabaseReader;

  const superadmin = yield* reader
    .table('superadmins')
    .index('by_email', (q) =>
      q.eq('email', CommonEmailAddressesDomain.normalizeEmailAddress(email))
    )
    .first()
    .pipe(Effect.catchTag('DocumentDecodeError', Effect.die));

  return Option.isSome(superadmin);
});

/** Resolves the signed-in Usuario when they are Superadmin, else fails. */
export const requireSuperadmin = Effect.fn(
  'ResidentialUnits.requireSuperadmin'
)(function* () {
  const identity = yield* AuthenticationDomain.CurrentUserIdentity;

  const user = yield* UsersApplication.getOneByIdentityTokenIdentifier(
    identity.tokenIdentifier
  ).pipe(UsersDomain.isActiveOrNull);

  if (Predicate.isNull(user)) return yield* new Domain.NotSuperadminError();

  const isSuperadmin = yield* isSuperadminEmail(user.email);

  if (!isSuperadmin) return yield* new Domain.NotSuperadminError();

  return user;
});

/** Idempotent: grants the Superadmin role to `email` once. */
export const grantSuperadmin = Effect.fn('ResidentialUnits.grantSuperadmin')(
  function* (email: string) {
    const writer = yield* DatabaseWriter;

    const normalizedEmail =
      CommonEmailAddressesDomain.normalizeEmailAddress(email);

    const isAlreadySuperadmin = yield* isSuperadminEmail(normalizedEmail);

    if (isAlreadySuperadmin) return;

    yield* writer
      .table('superadmins')
      .insert({ email: normalizedEmail })
      .pipe(Effect.catchTag('DocumentEncodeError', Effect.die));
  }
);
