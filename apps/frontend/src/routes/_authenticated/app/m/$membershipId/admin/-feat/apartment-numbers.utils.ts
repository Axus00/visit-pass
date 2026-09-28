import * as Predicate from 'effect/Predicate';
import * as Result from 'effect/Result';

import * as ResidentialUnitsShared from '@repo/backend/shared/residentialUnits';

/** The backend accepts at most this many numbers per `createApartments` call. */
export const MAX_APARTMENTS_PER_BATCH = 500;

const RANGE_PATTERN = /^(\d+)-(\d+)$/;
const SINGLE_PATTERN = /^[\p{L}\p{N}]+$/u;
const TOO_MANY_MESSAGE = `Puedes agregar hasta ${MAX_APARTMENTS_PER_BATCH} Apartamentos a la vez.`;

/**
 * Reads what the Administrador types in "Agregar apartamentos": numbers and
 * ranges separated by commas, semicolons, spaces or line breaks, such as
 * `101-104, 201-204, 301`. Ranges keep the start's zero padding (`01-03` →
 * `01, 02, 03`); repeated numbers appear once, in the order first typed. Fails
 * with a Spanish message the form shows as-is.
 */
export function parseApartmentNumbers(
  text: string
): Result.Result<ReadonlyArray<string>, string> {
  const tokens = text
    .replace(/\s*[-–—]\s*/g, '-')
    .split(/[,;\s]+/)
    .filter((token) => token.length > 0);

  if (tokens.length === 0)
    return Result.fail('Escribe al menos un número de Apartamento.');

  const numbers = new Set<string>();

  for (const token of tokens) {
    const range = RANGE_PATTERN.exec(token);

    if (Predicate.isNotNull(range)) {
      const [, startText = '', endText = ''] = range;
      const start = Number(startText);
      const end = Number(endText);
      // Ends past the safe integers would never finish the expansion loop.
      const hasValidEnds = [startText, endText].every(
        (rangeEnd) =>
          rangeEnd.length <= ResidentialUnitsShared.APARTMENT_PART_MAX_LENGTH &&
          Number.isSafeInteger(Number(rangeEnd))
      );

      if (!hasValidEnds)
        return Result.fail(
          `No entendemos «${token}». Usa números como 101 o rangos como 101-104.`
        );

      if (end < start)
        return Result.fail(
          `El rango ${token} está al revés: escribe primero el número menor.`
        );

      // A single range past the limit fails before it is expanded.
      if (end - start + 1 > MAX_APARTMENTS_PER_BATCH)
        return Result.fail(TOO_MANY_MESSAGE);

      for (let value = start; value <= end; value += 1)
        numbers.add(String(value).padStart(startText.length, '0'));

      if (numbers.size > MAX_APARTMENTS_PER_BATCH)
        return Result.fail(TOO_MANY_MESSAGE);

      continue;
    }

    const isValidSingle =
      SINGLE_PATTERN.test(token) &&
      token.length <= ResidentialUnitsShared.APARTMENT_PART_MAX_LENGTH;

    if (!isValidSingle)
      return Result.fail(
        `No entendemos «${token}». Usa números como 101 o rangos como 101-104.`
      );

    numbers.add(token.toUpperCase());
  }

  if (numbers.size > MAX_APARTMENTS_PER_BATCH)
    return Result.fail(TOO_MANY_MESSAGE);

  return Result.succeed([...numbers]);
}
