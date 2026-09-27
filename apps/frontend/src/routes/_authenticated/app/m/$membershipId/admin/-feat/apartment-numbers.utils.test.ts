import * as Result from 'effect/Result';
import { describe, expect, it } from 'vitest';

import {
  MAX_APARTMENTS_PER_BATCH,
  parseApartmentNumbers,
} from './apartment-numbers.utils';

function parsed(text: string) {
  const result = parseApartmentNumbers(text);

  if (Result.isFailure(result)) throw new Error(result.failure);

  return result.success;
}

function failure(text: string) {
  const result = parseApartmentNumbers(text);

  if (Result.isSuccess(result))
    throw new Error(`Expected a failure, got ${result.success.join(',')}`);

  return result.failure;
}

describe('parseApartmentNumbers', () => {
  it('expands ranges and keeps single numbers in typed order', () => {
    expect(parsed('101-104, 201-204, 301')).toEqual([
      '101',
      '102',
      '103',
      '104',
      '201',
      '202',
      '203',
      '204',
      '301',
    ]);
  });

  it('accepts semicolons, spaces, line breaks and spaced or en-dash ranges', () => {
    expect(parsed('101 – 102;201\n301   302 - 303')).toEqual([
      '101',
      '102',
      '201',
      '301',
      '302',
      '303',
    ]);
  });

  it('keeps the zero padding of the range start', () => {
    expect(parsed('01-03')).toEqual(['01', '02', '03']);
  });

  it('lists repeated numbers once', () => {
    expect(parsed('101-103, 102, 101')).toEqual(['101', '102', '103']);
  });

  it('accepts alphanumeric names such as penthouses, uppercased', () => {
    expect(parsed('ph1, 402b')).toEqual(['PH1', '402B']);
  });

  it('asks for a number when the text is blank', () => {
    expect(failure('  , ;')).toBe('Escribe al menos un número de Apartamento.');
  });

  it('rejects reversed ranges', () => {
    expect(failure('104-101')).toContain('104-101');
  });

  it('rejects tokens it cannot read', () => {
    expect(failure('101, 1o2-/x')).toContain('1o2-/x');
  });

  it('rejects more numbers than one batch allows', () => {
    expect(failure(`1-${MAX_APARTMENTS_PER_BATCH + 1}`)).toContain(
      String(MAX_APARTMENTS_PER_BATCH)
    );
    expect(parsed(`1-${MAX_APARTMENTS_PER_BATCH}`)).toHaveLength(
      MAX_APARTMENTS_PER_BATCH
    );
  });

  it('counts overlapping ranges by their unique numbers', () => {
    expect(parsed('1-300, 200-450')).toHaveLength(450);
    expect(failure('1-300, 200-501')).toContain(
      String(MAX_APARTMENTS_PER_BATCH)
    );
  });
});
