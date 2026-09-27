import * as Effect from 'effect/Effect';
import * as Encoding from 'effect/Encoding';

const PASS_TOKEN_BYTES = 16;

/**
 * A fresh opaque Pase token: 128 random bits as unpadded base64url (22 chars).
 *
 * Convex's default runtime exposes Web Crypto, including
 * `crypto.getRandomValues`, to queries and mutations. There, like
 * `Math.random`, it draws from a cryptographically strong generator that
 * Convex seeds per function execution, so a retried mutation yields the same
 * token (keeping the mutation deterministic) while clients cannot predict it.
 * Only call this from mutations: a query result must not depend on randomness.
 */
export const generatePassToken = Effect.sync(() =>
  Encoding.encodeBase64Url(
    crypto.getRandomValues(new Uint8Array(PASS_TOKEN_BYTES))
  )
);
