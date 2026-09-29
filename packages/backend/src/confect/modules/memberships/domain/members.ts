/**
 * Rejects what is plainly not an address (`@` followed by a dotted domain);
 * WorkOS verifies the rest when the invited person signs in.
 */
export function isPlausibleEmailAddress(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
