import { describe, expect, it } from 'vitest';

import { describeBackendError } from './backend-errors.utils';

describe('describeBackendError', () => {
  it('names the Apartamento limit the unit reached', () => {
    expect(
      describeBackendError({
        _tag: 'ResidentialUnits/ApartmentLimitReachedError',
        limit: 2000,
      })
    ).toBe('La unidad alcanzó el máximo de 2000 Apartamentos.');
  });

  it('describes a reason before its tag', () => {
    expect(
      describeBackendError({
        _tag: 'Memberships/InvalidMembershipError',
        reason: 'invalidEmail',
      })
    ).toBe('El correo no es válido.');
  });

  it('falls back for an unknown error', () => {
    expect(describeBackendError(new Error('boom'))).toBe(
      'Algo salió mal. Inténtalo de nuevo.'
    );
  });
});
