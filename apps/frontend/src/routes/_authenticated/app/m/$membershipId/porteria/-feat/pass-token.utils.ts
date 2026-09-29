import * as Predicate from 'effect/Predicate';
import * as Result from 'effect/Result';

/** Pase tokens are unpadded base64url; this range leaves room for rotations. */
const PASS_TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

/** The token segment of a public Pase link such as `https://…/p/<token>`. */
const PASS_LINK_PATTERN = /\/p\/([^/?#\s]+)/;

/**
 * The Pase token inside what the camera read or the Portero pasted: a bare
 * token or a full `/p/<token>` link. `null` when the text is not a Pase, such
 * as a Wi-Fi QR or a typo.
 */
export function parsePassToken(scannedText: string) {
  const text = scannedText.trim();
  const linkMatch = PASS_LINK_PATTERN.exec(text);
  const linkSegment = linkMatch?.[1];

  const candidate = Predicate.isUndefined(linkSegment)
    ? text
    : Result.getOrElse(
        Result.try(() => decodeURIComponent(linkSegment)),
        () => ''
      );

  return PASS_TOKEN_PATTERN.test(candidate) ? candidate : null;
}
