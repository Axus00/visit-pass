import * as Predicate from 'effect/Predicate';

import type { UsersDoc } from '../../../_generated/docs';

/**
 * Rejects what is plainly not an address (`@` followed by a dotted domain);
 * WorkOS verifies the rest when the invited person signs in.
 */
export function isPlausibleEmailAddress(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * The name to show for a Membresía: the signed-in Usuario's name, else the
 * name the Administrador typed when inviting.
 */
export function formatMemberName(args: {
  readonly user: Pick<UsersDoc, 'firstName' | 'lastName'> | null;
  readonly displayName: string | undefined;
}) {
  const userName = Predicate.isNull(args.user)
    ? ''
    : [args.user.firstName, args.user.lastName]
        .filter(Predicate.isNotNull)
        .join(' ')
        .trim();

  return userName.length > 0 ? userName : args.displayName;
}
